// Types for CSV/Excel import

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParsedFile {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
  rowCount: number;
  hasSplitDate: boolean; // Flag for Year/Month/Day format
}

// Database field mapping - supports both single date column and split columns
export interface ColumnMapping {
  // Single date column OR split columns
  date: string | null;
  year: string | null;
  month: string | null;
  day: string | null;
  // Other fields
  description: string | null;
  clientName: string | null;
  amountGross: string | null;
  amountPaid: string | null;
  category: string | null;
  notes: string | null;
  paymentStatus: string | null;
  invoiceStatus: string | null;
  invoiceSentDate: string | null;
  paidDate: string | null;
}

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: "תאריך (עמודה אחת)",
  year: "שנה",
  month: "חודש",
  day: "יום",
  description: "תיאור",
  clientName: "לקוח",
  amountGross: "סכום",
  amountPaid: "שולם",
  category: "קטגוריה",
  notes: "הערות",
  paymentStatus: "סטטוס תשלום",
  invoiceStatus: "סטטוס חשבונית",
  invoiceSentDate: "תאריך שליחת חשבונית",
  paidDate: "תאריך תשלום",
};

// Status mapping from various formats to our system
export const PAYMENT_STATUS_MAPPINGS: Record<string, "unpaid" | "partial" | "paid"> = {
  // English - various formats
  "unpaid": "unpaid",
  "not paid": "unpaid",
  "pending": "unpaid",
  "paid": "paid",
  "partial": "partial",
  "partially paid": "partial",
  // Hebrew
  "שולם": "paid",
  "לא שולם": "unpaid",
  "ממתין": "unpaid",
  "חלקי": "partial",
};

export const INVOICE_STATUS_MAPPINGS: Record<string, "draft" | "sent" | "paid" | "cancelled"> = {
  // Hebrew
  "נשלח": "sent",
  "נשלחה": "sent",
  "שולם": "paid",
  "טיוטה": "draft",
  "בוטל": "cancelled",
  // English
  "sent": "sent",
  "paid": "paid",
  "draft": "draft",
  "cancelled": "cancelled",
};

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}
