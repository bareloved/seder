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
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>התראות Push</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(pushLabels) as Array<keyof NudgePushPreferences>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{pushLabels[key]}</Label>
              <Switch
                checked={pushPrefs[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>יום תזכורת שבועית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>באיזה יום לשלוח תזכורת חשבוניות?</Label>
            <Select
              value={String(weeklyDay)}
              onValueChange={(v) => setWeeklyDay(Number(v))}
              dir="rtl"
            >
              <SelectTrigger className="w-32">
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

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
