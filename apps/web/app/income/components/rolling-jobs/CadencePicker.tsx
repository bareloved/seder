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
  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((kind) => (
          <Button
            key={kind}
            type="button"
            size="sm"
            variant={value.kind === kind ? "default" : "outline"}
            onClick={() => {
              if (kind === "daily") onChange({ kind: "daily", interval: 1 });
              if (kind === "weekly") onChange({ kind: "weekly", interval: 1, weekdays: [new Date().getDay()] });
              if (kind === "monthly") onChange({ kind: "monthly", interval: 1, dayOfMonth: new Date().getDate() });
            }}
          >
            {kind === "daily" && "יומי"}
            {kind === "weekly" && "שבועי"}
            {kind === "monthly" && "חודשי"}
          </Button>
        ))}
      </div>

      {value.kind === "daily" && (
        <div className="flex items-center gap-2">
          <span className="text-sm">כל</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={365}
            value={value.interval}
            onChange={(e) =>
              onChange({ kind: "daily", interval: Math.max(1, parseInt(e.target.value || "1", 10)) })
            }
            className="w-20"
          />
          <span className="text-sm">ימים</span>
        </div>
      )}

      {value.kind === "weekly" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">כל</span>
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
              className="w-20"
            />
            <span className="text-sm">שבועות ב-</span>
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
                  className={`h-9 w-9 rounded-full border text-sm ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground"
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
          <span className="text-sm">כל</span>
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
            className="w-20"
          />
          <span className="text-sm">חודשים ביום</span>
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
            className="w-20"
          />
        </div>
      )}
    </div>
  );
}
