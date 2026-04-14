"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CadencePicker } from "./CadencePicker";
import { generateOccurrences, type Cadence, type RollingJob } from "@seder/shared";
import type { Client, Category } from "@/db/schema";
import { createRollingJobAction, updateRollingJobAction } from "@/app/rolling-jobs/actions";

interface RollingJobFormProps {
  initial?: Partial<RollingJob>;
  clients: Client[];
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RollingJobForm({ initial, clients, categories, onSaved, onCancel }: RollingJobFormProps) {
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

  const labelCls = "text-xs font-medium text-slate-600 dark:text-slate-300";
  const selectCls =
    "w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/30 focus:border-[#2ecc71]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col pt-3" dir="rtl">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className={labelCls}>שם הסדרה</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>תיאור (יופיע על כל רשומה)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>לקוח</Label>
            <select
              value={clientId ?? "__none__"}
              onChange={(e) => handleClientPick(e.target.value)}
              className={selectCls}
            >
              <option value="__none__">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input
              placeholder="או הקלד שם חופשי"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>קטגוריה</Label>
            <select
              value={categoryId ?? "__none__"}
              onChange={(e) => setCategoryId(e.target.value === "__none__" ? null : e.target.value)}
              className={selectCls}
            >
              <option value="__none__">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>סכום (₪)</Label>
            <Input dir="ltr" value={amountGross} onChange={(e) => setAmountGross(e.target.value)} required className="font-numbers" />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>מע"מ %</Label>
            <Input dir="ltr" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="font-numbers" />
          </div>
          <div className="space-y-1.5 flex flex-col">
            <Label className={labelCls}>כולל מע"מ</Label>
            <div className="h-9 flex items-center">
              <Switch checked={includesVat} onCheckedChange={setIncludesVat} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>תדירות</Label>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3">
            <CadencePicker value={cadence} onChange={setCadence} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>תאריך התחלה</Label>
            <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>תאריך סיום (לא חובה)</Label>
            <Input
              type="date"
              dir="ltr"
              value={endDate ?? ""}
              onChange={(e) => setEndDate(e.target.value || null)}
            />
          </div>
        </div>

        {preview.length > 0 && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">תצוגה מקדימה:</span>{" "}
              <span dir="ltr" className="font-numbers">{preview.join(" · ")}</span>
              {" …"}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className={labelCls}>הערות</Label>
          <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} />
        </div>
      </div>

      <div className="flex justify-start gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-border">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#2ecc71] hover:bg-[#27ae60] text-white disabled:opacity-60"
        >
          {submitting ? "שומר..." : initial?.id ? "עדכון" : "יצירה"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>ביטול</Button>
      </div>
    </form>
  );
}
