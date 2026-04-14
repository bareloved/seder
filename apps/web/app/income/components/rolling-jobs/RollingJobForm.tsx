"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  FileText,
  User,
  Tag,
  CreditCard,
  Repeat,
  CalendarDays,
  Receipt,
  Percent,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip } from "../CategoryChip";
import { ClientDropdown } from "@/app/clients/components/ClientDropdown";
import { CadencePicker } from "./CadencePicker";
import { generateOccurrences, type Cadence, type RollingJob } from "@seder/shared";
import type { Client, Category } from "@/db/schema";
import { createRollingJobAction, updateRollingJobAction } from "@/app/rolling-jobs/actions";

// Shared styles — must match IncomeDetailEdit for visual consistency
const inputClassName =
  "h-10 px-3 text-base font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md transition-all shadow-none text-right placeholder:text-slate-400";
const labelClassName =
  "text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5";

interface RollingJobFormProps {
  initial?: Partial<RollingJob>;
  clients: Client[];
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RollingJobForm({ initial, clients, categories, onSaved, onCancel, onDelete }: RollingJobFormProps) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [clientId, setClientId] = React.useState<string | null>(initial?.clientId ?? null);
  const [clientName, setClientName] = React.useState(initial?.clientName ?? "");
  const [categoryId, setCategoryId] = React.useState<string | null>(initial?.categoryId ?? null);
  const [amountGross, setAmountGross] = React.useState(initial?.amountGross ?? "");
  const [vatRate, setVatRate] = React.useState(initial?.vatRate ?? "18");
  const [includesVat, setIncludesVat] = React.useState(initial?.includesVat ?? true);
  const [cadence, setCadence] = React.useState<Cadence>(
    initial?.cadence ?? { kind: "weekly", interval: 1, weekdays: [new Date().getDay()] },
  );
  const [startDate, setStartDate] = React.useState(initial?.startDate ?? todayIso());
  const [endDate, setEndDate] = React.useState<string | null>(initial?.endDate ?? null);
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  const preview = React.useMemo(() => {
    try {
      const horizonEnd = new Date();
      horizonEnd.setFullYear(horizonEnd.getFullYear() + 1);
      const out = generateOccurrences({
        cadence,
        startDate: new Date(`${startDate}T12:00:00Z`),
        endDate: endDate ? new Date(`${endDate}T12:00:00Z`) : undefined,
        horizonEnd,
      });
      return out.slice(0, 4).map((d) =>
        `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      );
    } catch {
      return [];
    }
  }, [cadence, startDate, endDate]);

  const handleClientPick = (value: string) => {
    if (value === "__none__") {
      setClientId(null);
      return;
    }
    const c = clients.find((x) => x.id === value);
    if (c) {
      setClientId(c.id);
      setClientName(c.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      title,
      description,
      clientId,
      clientName,
      categoryId,
      amountGross,
      vatRate,
      includesVat,
      cadence,
      startDate,
      endDate,
      notes: notes || null,
    };
    const isEdit = !!initial?.id;
    try {
      const result = isEdit
        ? await updateRollingJobAction(initial!.id!, input)
        : await createRollingJobAction(input);
      if (result.success) {
        toast.success(isEdit ? "הסדרה עודכנה" : "הסדרה נוצרה");
        onSaved();
      } else {
        toast.error(typeof result.error === "string" ? result.error : "שמירה נכשלה");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const activeCategories = categories.filter((c) => !c.isArchived);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-3 font-sans" dir="rtl">
      {/* Title */}
      <div>
        <label className={labelClassName}>
          <Repeat className="h-3.5 w-3.5" />
          שם הסדרה
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          placeholder="למשל: שיעור שבועי"
          className={inputClassName}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClassName}>
          <FileText className="h-3.5 w-3.5" />
          תיאור עבודה
        </label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={500}
          placeholder="יופיע על כל רשומה"
          className={inputClassName}
        />
      </div>

      {/* Client & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>
            <User className="h-3.5 w-3.5" />
            לקוח
          </label>
          <ClientDropdown
            clients={clients}
            selectedClientId={clientId}
            selectedClientName={clientName}
            onSelect={(client, name) => {
              setClientId(client?.id ?? null);
              setClientName(name);
            }}
            className={cn(inputClassName, "w-full")}
            allowCreate={true}
          />
        </div>

        <div>
          <label className={labelClassName}>
            <Tag className="h-3.5 w-3.5" />
            קטגוריה
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(inputClassName, "w-full justify-between font-normal")}
              >
                <span className="flex-1 text-right">
                  {selectedCategory ? (
                    <CategoryChip category={selectedCategory} size="sm" withIcon={true} />
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">בחר קטגוריה</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[120px] w-[150px]" align="end">
              <DropdownMenuItem
                onClick={() => setCategoryId(null)}
                className="justify-end pr-2 text-xs text-slate-500"
              >
                —
              </DropdownMenuItem>
              {activeCategories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className="justify-end pr-2"
                >
                  <CategoryChip category={cat} size="sm" withIcon={true} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className={labelClassName}>
          <CreditCard className="h-3.5 w-3.5" />
          סכום
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
            ₪
          </span>
          <Input
            type="text"
            inputMode="decimal"
            value={amountGross}
            onChange={(e) => setAmountGross(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            required
            className={cn(
              inputClassName,
              "pl-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            )}
            dir="rtl"
          />
        </div>
      </div>

      {/* VAT row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>
            <Percent className="h-3.5 w-3.5" />
            מע״מ %
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            className={cn(inputClassName, "text-right")}
            dir="rtl"
          />
        </div>
        <div>
          <label className={labelClassName}>
            <Receipt className="h-3.5 w-3.5" />
            כולל מע״מ
          </label>
          <div className="h-10 flex items-center">
            <Switch checked={includesVat} onCheckedChange={setIncludesVat} />
          </div>
        </div>
      </div>

      {/* Cadence — keeps its own styled sub-panel */}
      <div>
        <label className={labelClassName}>
          <Repeat className="h-3.5 w-3.5" />
          תדירות
        </label>
        <div className="rounded-md border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-slate-800/40 p-3">
          <CadencePicker value={cadence} onChange={setCadence} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>
            <CalendarDays className="h-3.5 w-3.5" />
            תאריך התחלה
          </label>
          <Input
            type="date"
            dir="ltr"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>
            <CalendarDays className="h-3.5 w-3.5" />
            תאריך סיום (לא חובה)
          </label>
          <Input
            type="date"
            dir="ltr"
            value={endDate ?? ""}
            onChange={(e) => setEndDate(e.target.value || null)}
            className={inputClassName}
          />
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">תצוגה מקדימה:</span>{" "}
            <span dir="ltr" className="font-numbers">{preview.join(" · ")}</span>
            {" …"}
          </p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={labelClassName}>
          <Receipt className="h-3.5 w-3.5" />
          הערות
        </label>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={2}
          className="w-full h-20 text-base font-sans p-3 border border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-400 rounded-md resize-none focus:outline-none focus:ring-0 transition-all"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-border">
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "שומר..." : initial?.id ? "שמור שינויים" : "צור סדרה"}
        </Button>
        {onDelete && initial?.id && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            מחק
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-700"
        >
          סגור
        </Button>
      </div>
    </form>
  );
}
