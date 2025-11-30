import * as XLSX from "xlsx";
import type { ParsedFile, ParsedRow, ColumnMapping } from "./types";
import { PAYMENT_STATUS_MAPPINGS, INVOICE_STATUS_MAPPINGS } from "./types";

/**
 * Parse a CSV or Excel file and return structured data
 */
export function parseFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }

        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          raw: false,
          dateNF: "yyyy-mm-dd",
        });

        if (jsonData.length === 0) {
          reject(new Error("הקובץ ריק"));
          return;
        }

        // Extract headers from first row keys
        const headers = Object.keys(jsonData[0]);
        
        // Check if we have split date columns (Year, Month, Day)
        const hasYearColumn = headers.some(h => /^year$/i.test(h));
        const hasMonthColumn = headers.some(h => /^month$/i.test(h));
        const hasSplitDate = hasYearColumn && hasMonthColumn;
        
        // Convert rows
        const rows: ParsedRow[] = jsonData.map((row) => {
          const parsedRow: ParsedRow = {};
          for (const key of headers) {
            const value = row[key];
            parsedRow[key] = value !== undefined && value !== "" ? String(value) : null;
          }
          return parsedRow;
        });

        resolve({
          headers,
          rows,
          fileName: file.name,
          rowCount: rows.length,
          hasSplitDate,
        });
      } catch (error) {
        reject(new Error(`שגיאה בקריאת הקובץ: ${error instanceof Error ? error.message : "Unknown error"}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("שגיאה בקריאת הקובץ"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectMappings(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  
  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    // Single date column
    date: [/^תאריך$/i, /^date$/i],
    // Split date columns
    year: [/^year$/i, /^שנה$/i],
    month: [/^month$/i, /^חודש$/i],
    day: [/^day$/i, /^יום$/i],
    // Other fields
    description: [/תיאור/i, /description/i, /gigdescription/i, /פרטים/i, /עבודה/i],
    clientName: [/לקוח/i, /^client$/i, /שם/i, /מזמין/i],
    amountGross: [/סכום/i, /^amount$/i, /מחיר/i, /price/i, /sum/i, /total/i],
    amountPaid: [/שולם/i, /paid.*amount/i, /קיבלתי/i, /received/i],
    category: [/קטגוריה/i, /category/i, /סוג/i, /type/i],
    notes: [/הערות/i, /^notes$/i, /הערה/i, /comment/i],
    paymentStatus: [/^paymentstatus$/i, /payment.?status/i, /סטטוס.*תשלום/i],
    invoiceStatus: [/^invoicestatus$/i, /invoice.?status/i, /סטטוס.*חשבונית/i],
    invoiceSentDate: [/חשבונית.*תאריך/i, /invoice.*date/i, /שליחה/i],
    paidDate: [/תאריך.*תשלום/i, /payment.*date/i, /paid.*date/i],
  };

  for (const header of headers) {
    const normalizedHeader = header.trim().toLowerCase();
    
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      if (mapping[field as keyof ColumnMapping]) continue; // Already mapped
      
      for (const pattern of fieldPatterns) {
        if (pattern.test(normalizedHeader) || pattern.test(header)) {
          mapping[field as keyof ColumnMapping] = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Build a date from split Year/Month/Day columns or single date column
 */
export function buildDateFromRow(
  row: ParsedRow, 
  mapping: ColumnMapping
): string | null {
  // Try split date first (Year/Month/Day columns)
  if (mapping.year && mapping.month) {
    const year = row[mapping.year];
    const month = row[mapping.month];
    const day = mapping.day ? row[mapping.day] : null;
    
    if (year && month) {
      const y = parseInt(String(year), 10);
      const m = parseInt(String(month), 10);
      // Day might be empty or a float like "3.0"
      let d = day ? Math.floor(parseFloat(String(day))) : 1;
      
      // Validate
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
        // If day is invalid or missing, default to 1
        if (isNaN(d) || d < 1 || d > 31) {
          d = 1;
        }
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }
  
  // Fallback to single date column
  if (mapping.date) {
    return parseDate(row[mapping.date] as string);
  }
  
  return null;
}

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      let year: number, month: number, day: number;
      
      if (format === formats[0]) {
        // ISO format: YYYY-MM-DD
        [, year, month, day] = match.map(Number) as [string, number, number, number];
      } else {
        // Other formats: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
        [, day, month, year] = match.map(Number) as [string, number, number, number];
      }

      // Validate
      if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  // Try parsing as a date object (handles Excel date serials and other formats)
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Parse an amount string, handling various number formats
 */
export function parseAmount(value: string | null): number | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Remove currency symbols and whitespace
  let cleaned = trimmed
    .replace(/[₪$€£¥]/g, "")
    .replace(/\s/g, "")
    .replace(/ILS/gi, "")
    .trim();

  // Handle negative numbers in parentheses
  const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Determine decimal separator
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot > lastComma) {
    // Dot is decimal separator
    cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma > lastDot) {
    // Comma is decimal separator
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // No decimal or only one type
    cleaned = cleaned.replace(/,/g, "");
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

/**
 * Parse payment status to our system's format
 */
export function parsePaymentStatus(value: string | null): "unpaid" | "partial" | "paid" {
  if (!value) return "unpaid";
  
  const normalized = value.trim().toLowerCase();
  
  // First try exact match
  for (const [key, status] of Object.entries(PAYMENT_STATUS_MAPPINGS)) {
    if (normalized === key.toLowerCase()) {
      return status;
    }
  }
  
  // Then try contains match for common keywords
  if (normalized.includes("paid") && !normalized.includes("unpaid") && !normalized.includes("not")) {
    return "paid";
  }
  if (normalized.includes("partial")) {
    return "partial";
  }
  
  return "unpaid";
}

/**
 * Parse invoice status to our system's format
 */
export function parseInvoiceStatus(value: string | null): "draft" | "sent" | "paid" | "cancelled" {
  if (!value) return "draft";
  
  const normalized = value.trim().toLowerCase();
  
  for (const [key, status] of Object.entries(INVOICE_STATUS_MAPPINGS)) {
    if (normalized === key.toLowerCase()) {
      return status;
    }
  }
  
  return "draft";
}
