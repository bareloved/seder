"use client";

import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

export function DataSection() {
    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium">ניהול נתונים</h2>
                <p className="text-sm text-muted-foreground">ייצוא וגיבוי של הנתונים שלך</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Download className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-1">ייצוא נתונים</h3>
                        <p className="text-sm text-muted-foreground mb-4">הורד קובץ CSV של כל ההכנסות וההוצאות שלך</p>
                        <Button variant="outline" className="w-full">ייצוא ל-CSV</Button>
                    </div>
                </div>

                <div className="border rounded-lg p-6 space-y-4 opacity-70">
                    <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Upload className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-1">ייבוא מ-CSV</h3>
                        <p className="text-sm text-muted-foreground mb-4">טען נתונים מקובץ חיצוני (בקרוב)</p>
                        <Button variant="outline" className="w-full" disabled>ייבוא קובץ</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
