"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { parseFile, autoDetectMappings, buildDateFromRow } from "./utils";
import { bulkImportEntries } from "./actions";
import type { ParsedFile, ColumnMapping, ImportResult } from "./types";
import { FIELD_LABELS } from "./types";

type Step = "upload" | "mapping" | "preview" | "result";

export function ImportClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    year: null,
    month: null,
    day: null,
    description: null,
    clientName: null,
    amountGross: null,
    amountPaid: null,
    category: null,
    notes: null,
    paymentStatus: null,
    invoiceStatus: null,
    invoiceSentDate: null,
    paidDate: null,
  });
  const [markHistoricalAsPaid, setMarkHistoricalAsPaid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Check if we're using split date columns
  const usingSplitDate = Boolean(mapping.year && mapping.month);
  const usingSingleDate = Boolean(mapping.date);

  // Validation - either single date OR year+month required
  const isMappingValid = () => {
    const hasValidDate = usingSplitDate || usingSingleDate;
    const hasDescription = mapping.description !== null;
    const hasAmount = mapping.amountGross !== null;
    // Client is optional now - defaults to "לא צוין"
    return hasValidDate && hasDescription && hasAmount;
  };

  // File handling
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);

      // Auto-detect mappings
      const detectedMappings = autoDetectMappings(parsed.headers);
      setMapping((prev) => ({ ...prev, ...detectedMappings }));

      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בקריאת הקובץ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // Mapping handlers
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "__none__" ? null : value,
    }));
  };

  // Import handler
  const handleImport = async () => {
    if (!parsedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const importResult = await bulkImportEntries(
        parsedFile.rows,
        mapping,
        markHistoricalAsPaid
      );
      setResult(importResult);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא");
    } finally {
      setIsLoading(false);
    }
  };

  // Get preview date for a row
  const getPreviewDate = (row: Record<string, unknown>) => {
    const date = buildDateFromRow(row as Record<string, string | number | null>, mapping);
    return date || "-";
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center
          transition-all duration-200 cursor-pointer
          ${
            isDragging
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-white" />
            )}
          </div>

          <div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              גרור קובץ לכאן או לחץ לבחירה
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              CSV, Excel (.xlsx, .xls)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
        <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-2">
          פורמטים נתמכים:
        </h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>עמודות תאריך נפרדות (Year, Month, Day) או עמודת תאריך אחת</li>
          <li>עמודות: GigDescription, Client, Amount, PaymentStatus, InvoiceStatus</li>
          <li>סטטוסים: Paid/Unpaid או שולם/לא שולם, נשלח/טיוטה</li>
        </ul>
      </div>
    </div>
  );

  // Render mapping step
  const renderMappingStep = () => (
    <div className="space-y-6">
      {/* File info */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
        <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-medium text-emerald-700 dark:text-emerald-300">
            {parsedFile?.fileName}
          </p>
          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
            {parsedFile?.rowCount} שורות נמצאו
            {parsedFile?.hasSplitDate && " • זוהה פורמט Year/Month/Day"}
          </p>
        </div>
      </div>

      {/* Date mapping section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          תאריך (חובה)
        </h3>
        
        {parsedFile?.hasSplitDate ? (
          // Split date columns
          <div className="space-y-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              זוהו עמודות תאריך נפרדות - Year, Month, Day
            </p>
            <div className="grid gap-3">
              <MappingRow
                field="year"
                label={FIELD_LABELS.year}
                value={mapping.year}
                headers={parsedFile?.headers || []}
                onChange={(value) => handleMappingChange("year", value)}
                required
              />
              <MappingRow
                field="month"
                label={FIELD_LABELS.month}
                value={mapping.month}
                headers={parsedFile?.headers || []}
                onChange={(value) => handleMappingChange("month", value)}
                required
              />
              <MappingRow
                field="day"
                label={FIELD_LABELS.day}
                value={mapping.day}
                headers={parsedFile?.headers || []}
                onChange={(value) => handleMappingChange("day", value)}
              />
            </div>
          </div>
        ) : (
          // Single date column
          <MappingRow
            field="date"
            label={FIELD_LABELS.date}
            value={mapping.date}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("date", value)}
            required
          />
        )}
      </div>

      {/* Required mappings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          שדות חובה
        </h3>
        <div className="grid gap-3">
          <MappingRow
            field="description"
            label={FIELD_LABELS.description}
            value={mapping.description}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("description", value)}
            required
          />
          <MappingRow
            field="amountGross"
            label={FIELD_LABELS.amountGross}
            value={mapping.amountGross}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("amountGross", value)}
            required
          />
        </div>
      </div>

      {/* Optional mappings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          שדות אופציונליים
        </h3>
        <div className="grid gap-3">
          <MappingRow
            field="clientName"
            label={FIELD_LABELS.clientName}
            value={mapping.clientName}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("clientName", value)}
          />
          <MappingRow
            field="paymentStatus"
            label={FIELD_LABELS.paymentStatus}
            value={mapping.paymentStatus}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("paymentStatus", value)}
          />
          <MappingRow
            field="invoiceStatus"
            label={FIELD_LABELS.invoiceStatus}
            value={mapping.invoiceStatus}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("invoiceStatus", value)}
          />
          <MappingRow
            field="notes"
            label={FIELD_LABELS.notes}
            value={mapping.notes}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("notes", value)}
          />
          <MappingRow
            field="category"
            label={FIELD_LABELS.category}
            value={mapping.category}
            headers={parsedFile?.headers || []}
            onChange={(value) => handleMappingChange("category", value)}
          />
        </div>
      </div>

      {/* Historical data option */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
        <input
          type="checkbox"
          id="mark-paid"
          checked={markHistoricalAsPaid}
          onChange={(e) => setMarkHistoricalAsPaid(e.target.checked)}
          className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
        />
        <label
          htmlFor="mark-paid"
          className="text-amber-700 dark:text-amber-300"
        >
          סמן רשומות היסטוריות (לפני היום) כשולמו
        </label>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setParsedFile(null);
            setStep("upload");
          }}
        >
          <ArrowRight className="w-4 h-4 ms-2" />
          חזור
        </Button>
        <Button
          onClick={() => setStep("preview")}
          disabled={!isMappingValid()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          המשך לתצוגה מקדימה
          <ArrowLeft className="w-4 h-4 me-2" />
        </Button>
      </div>
    </div>
  );

  // Render preview step
  const renderPreviewStep = () => {
    const previewRows = parsedFile?.rows.slice(0, 5) || [];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            תצוגה מקדימה
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            מציג {previewRows.length} מתוך {parsedFile?.rowCount} שורות
          </p>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                  תאריך
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                  תיאור
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                  לקוח
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                  סכום
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {previewRows.map((row, i) => (
                <tr key={i} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {getPreviewDate(row)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {mapping.description
                      ? String(row[mapping.description] || "-")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {mapping.clientName
                      ? String(row[mapping.clientName] || "לא צוין")
                      : "לא צוין"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-mono">
                    {mapping.amountGross
                      ? `₪${String(row[mapping.amountGross] || "0")}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-2">
            סיכום לפני ייבוא:
          </h4>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• {parsedFile?.rowCount} רשומות יובאו</li>
            {markHistoricalAsPaid && (
              <li>• רשומות היסטוריות יסומנו כשולמו</li>
            )}
          </ul>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => setStep("mapping")}>
            <ArrowRight className="w-4 h-4 ms-2" />
            חזור למיפוי
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                מייבא...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 ms-2" />
                ייבא {parsedFile?.rowCount} רשומות
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Render result step
  const renderResultStep = () => (
    <div className="space-y-6 text-center">
      {result?.success ? (
        <>
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">
              הייבוא הושלם בהצלחה!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {result.imported} רשומות יובאו
              {result.skipped > 0 && `, ${result.skipped} דולגו`}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">
              הייבוא נכשל
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {result?.imported || 0} רשומות יובאו, {result?.skipped || 0} דולגו
            </p>
          </div>
        </>
      )}

      {/* Errors list */}
      {result && result.errors.length > 0 && (
        <div className="text-right p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 max-h-48 overflow-y-auto">
          <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">
            {result.errors.length} שגיאות:
          </h4>
          <ul className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
            {result.errors.slice(0, 20).map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
            {result.errors.length > 20 && (
              <li>... ועוד {result.errors.length - 20} שגיאות</li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setParsedFile(null);
            setResult(null);
            setStep("upload");
          }}
        >
          ייבא קובץ נוסף
        </Button>
        <Button
          onClick={() => router.push("/income")}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          חזור למעקב הכנסות
        </Button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            ייבוא נתונים
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            ייבא הכנסות מקובץ CSV או Excel
          </p>
        </div>

        {/* Progress steps */}
        <div dir="ltr" className="flex items-center justify-center gap-2 mb-8">
          {(["upload", "mapping", "preview", "result"] as Step[]).map(
            (s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700" />
                )}
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${
                    step === s
                      ? "bg-emerald-500 text-white"
                      : i < ["upload", "mapping", "preview", "result"].indexOf(step)
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }
                `}
                >
                  {i + 1}
                </div>
              </React.Fragment>
            )
          )}
        </div>

        {/* Content card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardContent className="p-6">
            {step === "upload" && renderUploadStep()}
            {step === "mapping" && renderMappingStep()}
            {step === "preview" && renderPreviewStep()}
            {step === "result" && renderResultStep()}
          </CardContent>
        </Card>

        {/* Back link */}
        {step === "upload" && (
          <div className="text-center mt-6">
            <Button
              variant="link"
              onClick={() => router.push("/income")}
              className="text-slate-500 dark:text-slate-400"
            >
              חזור למעקב הכנסות
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Mapping row component
function MappingRow({
  field,
  label,
  value,
  headers,
  onChange,
  required,
}: {
  field: string;
  label: string;
  value: string | null;
  headers: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const isSet = value !== null;

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className="flex-1 flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            required
              ? "text-slate-700 dark:text-slate-200"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {label}
        </span>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="flex items-center gap-2">
        <Select value={value || "__none__"} onValueChange={onChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="בחר עמודה..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">-- לא ממופה --</SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSet ? (
          <Check className="w-5 h-5 text-emerald-500" />
        ) : required ? (
          <AlertCircle className="w-5 h-5 text-red-400" />
        ) : (
          <div className="w-5 h-5" />
        )}
      </div>
    </div>
  );
}
