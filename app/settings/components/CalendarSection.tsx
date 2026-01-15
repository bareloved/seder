"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";

export function CalendarSection() {
    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium">לוח שנה</h2>
                <p className="text-sm text-muted-foreground">ניהול חיבור ל-Google Calendar וכללי ייבוא</p>
            </div>

            <div className="border rounded-lg p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium">Google Calendar</h3>
                        <p className="text-sm text-muted-foreground">חבר את לוח השנה שלך לייבוא אוטומטי של אירועים</p>
                    </div>
                </div>
                <Button variant="outline">התחבר</Button>
            </div>

            <div className="opacity-50 pointer-events-none space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">הגדרות ייבוא</h3>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label>ייבוא אוטומטי</Label>
                            <p className="text-xs text-muted-foreground">ייבא אירועים חדשים באופן אוטומטי ברקע</p>
                        </div>
                        <Switch disabled />
                    </div>
                </div>
            </div>
        </div>
    );
}
