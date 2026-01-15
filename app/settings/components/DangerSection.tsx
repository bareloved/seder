"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function DangerSection() {
    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium text-red-600">מחיקת חשבון</h2>
                <p className="text-sm text-muted-foreground">פעולות בלתי הפיכות לחשבון שלך</p>
            </div>

            <div className="border border-red-200 bg-red-50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium text-red-900">מחיקת חשבון</h3>
                        <p className="text-sm text-red-700">פעולה זו תמחק לצמיתות את החשבון שלך ואת כל הנתונים המקושרים אליו. לא ניתן לשחזר מידע לאחר ביצוע פעולה זו.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <Button variant="destructive">מחק חשבון</Button>
                </div>
            </div>
        </div>
    );
}
