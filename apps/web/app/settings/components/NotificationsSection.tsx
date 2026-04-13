"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateNudgeSettings } from "../actions";
import type { NudgePushPreferences } from "@/lib/nudges/types";

interface NotificationsSectionProps {
  initialSettings: {
    nudgeWeeklyDay: number;
    nudgePushEnabled: NudgePushPreferences;
  };
}

const pushLabels: Record<keyof NudgePushPreferences, string> = {
  overdue: "חשבוניות שלא שולמו (30+ יום)",
  weekly_uninvoiced: "תזכורת שבועית לחשבוניות",
  calendar_sync: "סנכרון יומן (תחילת חודש)",
  unpaid_check: "בדיקת תשלומים (סוף חודש)",
};

const dayNames = [
  { value: "0", label: "ראשון" },
  { value: "1", label: "שני" },
  { value: "2", label: "שלישי" },
  { value: "3", label: "רביעי" },
  { value: "4", label: "חמישי" },
  { value: "5", label: "שישי" },
  { value: "6", label: "שבת" },
];

export function NotificationsSection({ initialSettings }: NotificationsSectionProps) {
  const [weeklyDay, setWeeklyDay] = useState(initialSettings.nudgeWeeklyDay);
  const [pushPrefs, setPushPrefs] = useState<NudgePushPreferences>(
    initialSettings.nudgePushEnabled
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: keyof NudgePushPreferences) {
    setPushPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    startTransition(async () => {
      await updateNudgeSettings({
        nudgeWeeklyDay: weeklyDay,
        nudgePushEnabled: pushPrefs,
      });
    });
  }

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl">התראות Push</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-4">
          {(Object.keys(pushLabels) as Array<keyof NudgePushPreferences>).map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label className="flex-1 text-sm leading-snug text-slate-700 dark:text-slate-300 cursor-pointer" onClick={() => handleToggle(key)}>
                {pushLabels[key]}
              </Label>
              <Switch
                checked={pushPrefs[key]}
                onCheckedChange={() => handleToggle(key)}
                className="flex-shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl">יום תזכורת שבועית</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="flex items-center justify-between gap-3">
            <Label className="flex-1 text-sm leading-snug text-slate-700 dark:text-slate-300">באיזה יום לשלוח תזכורת?</Label>
            <Select
              value={String(weeklyDay)}
              onValueChange={(v) => setWeeklyDay(Number(v))}
              dir="rtl"
            >
              <SelectTrigger className="w-28 flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending} className="w-full md:w-auto bg-brand-primary hover:bg-[#27ae60] text-white">
        {isPending ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
