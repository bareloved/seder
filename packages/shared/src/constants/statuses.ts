import type { DisplayStatus, WorkStatus, MoneyStatus } from "../types/income";

// Status config for UI display
export const STATUS_CONFIG: Record<DisplayStatus, {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  "בוצע": {
    label: "בוצע",
    bgClass: "bg-blue-50/60 dark:bg-blue-900/20",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
  "נשלחה": {
    label: "נשלחה",
    bgClass: "bg-amber-50/60 dark:bg-amber-900/20",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  "שולם": {
    label: "שולם",
    bgClass: "bg-emerald-50/60 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
};

// Work status config for UI
export const WORK_STATUS_CONFIG: Record<WorkStatus, {
  label: string;
  tooltip: string;
  icon: "Clock" | "CheckCircle2";
  bgClass: string;
  textClass: string;
}> = {
  in_progress: {
    label: "בהמתנה",
    tooltip: "העבודה טרם בוצעה",
    icon: "Clock",
    bgClass: "bg-transparent",
    textClass: "text-slate-400 dark:text-slate-500",
  },
  done: {
    label: "בוצע",
    tooltip: "העבודה הושלמה",
    icon: "CheckCircle2",
    bgClass: "bg-transparent",
    textClass: "text-slate-400 dark:text-slate-500",
  },
};

// Money status config for UI
export const MONEY_STATUS_CONFIG: Record<MoneyStatus, {
  label: string;
  tooltip: string;
  icon: "FileX" | "Send" | "Banknote";
  bgClass: string;
  textClass: string;
}> = {
  no_invoice: {
    label: "ללא",
    tooltip: "טרם נשלחה חשבונית",
    icon: "FileX",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  invoice_sent: {
    label: "נשלחה",
    tooltip: "חשבונית נשלחה, ממתין לתשלום",
    icon: "Send",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  paid: {
    label: "שולם",
    tooltip: "התשלום התקבל",
    icon: "Banknote",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
};

// Default categories for new users
export const DEFAULT_CATEGORIES = [
  { name: "הופעות", color: "emerald", icon: "Sparkles", displayOrder: 1 },
  { name: "הפקה", color: "indigo", icon: "SlidersHorizontal", displayOrder: 2 },
  { name: "הקלטות", color: "sky", icon: "Mic2", displayOrder: 3 },
  { name: "הוראה", color: "amber", icon: "BookOpen", displayOrder: 4 },
  { name: "עיבודים", color: "purple", icon: "Layers", displayOrder: 5 },
  { name: "אחר", color: "slate", icon: "Circle", displayOrder: 6 },
] as const;
