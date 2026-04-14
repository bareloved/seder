"use client";

import * as React from "react";
import type { Cadence } from "@seder/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WEEKDAYS_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // Sun..Sat

interface CadencePickerProps {
  value: Cadence;
  onChange: (c: Cadence) => void;
}

export function CadencePicker({ value, onChange }: CadencePickerProps) {
  const kinds = [
    { key: "daily", label: "יומי" },
    { key: "weekly", label: "שבועי" },
    { key: "monthly", label: "חודשי" },
  ] as const;

  return (
    <div className="space-y-3" dir="rtl">
      <div className="inline-flex gap-1 p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        {kinds.map(({ key, label }) => {
          const selected = value.kind === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === "daily") onChange({ kind: "daily", interval: 1 });
                if (key === "weekly") onChange({ kind: "weekly", interval: 1, weekdays: [new Date().getDay()] });
                if (key === "monthly") onChange({ kind: "monthly", interval: 1, dayOfMonth: new Date().getDate() });
              }}
              className={`px-3 h-7 text-xs font-medium rounded-md transition-colors ${
                selected
                  ? "bg-[#2ecc71] text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-pressed={selected}
            >
              {label}
            </button>
          );
        })}
      </div>

      {value.kind === "daily" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-300">כל</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={365}
            value={value.interval}
            onChange={(e) =>
              onChange({ kind: "daily", interval: Math.max(1, parseInt(e.target.value || "1", 10)) })
            }
            className="w-14 h-8 text-sm font-numbers"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">ימים</span>
        </div>
      )}

      {value.kind === "weekly" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300">כל</span>
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={52}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  kind: "weekly",
                  interval: Math.max(1, parseInt(e.target.value || "1", 10)),
                })
              }
              className="w-14 h-8 text-sm font-numbers"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">שבועות ב-</span>
          </div>
          <div className="flex gap-1">
            {WEEKDAYS_HE.map((label, idx) => {
              const selected = value.weekdays.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? value.weekdays.filter((d) => d !== idx)
                      : [...value.weekdays, idx].sort();
                    if (next.length === 0) return;
                    onChange({ ...value, weekdays: next });
                  }}
                  className={`h-8 w-8 rounded-full border text-xs font-medium transition-colors ${
                    selected
                      ? "bg-[#2ecc71] text-white border-[#2ecc71]"
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                  aria-pressed={selected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.kind === "monthly" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-300">כל</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={12}
            value={value.interval}
            onChange={(e) =>
              onChange({
                ...value,
                kind: "monthly",
                interval: Math.max(1, parseInt(e.target.value || "1", 10)),
              })
            }
            className="w-14 h-8 text-sm font-numbers"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">חודשים ביום</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(e) =>
              onChange({
                ...value,
                kind: "monthly",
                dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value || "1", 10))),
              })
            }
            className="w-14 h-8 text-sm font-numbers"
          />
        </div>
      )}
    </div>
  );
}
