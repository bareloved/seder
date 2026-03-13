"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateNudgeSettings } from "../actions";
import type { NudgePushPreferences } from "@/lib/nudges/types";
import { DEFAULT_NUDGE_PUSH_PREFS } from "@/lib/nudges/types";

interface NotificationsSectionProps {
  initialSettings: {
    nudgeInvoiceDays: number;
    nudgePaymentDays: number;
    nudgePushEnabled: NudgePushPreferences;
  };
}

const pushLabels: Record<keyof NudgePushPreferences, string> = {
  uninvoiced: "עבודות ללא חשבונית",
  batch_invoice: "תזכורת שבועית לחשבוניות",
  overdue_payment: "תשלומים באיחור",
  way_overdue: "תשלומים באיחור חמור",
  partial_stale: "תשלום חלקי תקוע",
  unlogged_calendar: "אירועי יומן לא מיובאים",
  month_end: "תזכורת סוף חודש",
};

export function NotificationsSection({ initialSettings }: NotificationsSectionProps) {
  const [invoiceDays, setInvoiceDays] = useState(initialSettings.nudgeInvoiceDays);
  const [paymentDays, setPaymentDays] = useState(initialSettings.nudgePaymentDays);
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
        nudgeInvoiceDays: invoiceDays,
        nudgePaymentDays: paymentDays,
        nudgePushEnabled: pushPrefs,
      });
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ספים לתזכורות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>ימים עד תזכורת חשבונית</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={invoiceDays}
              onChange={(e) => setInvoiceDays(Number(e.target.value))}
              className="w-20 text-center"
              dir="ltr"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>ימים עד תזכורת תשלום</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={paymentDays}
              onChange={(e) => setPaymentDays(Number(e.target.value))}
              className="w-20 text-center"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

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

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
