"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportUserData, type ExportOptions } from "../actions";

type DateRange = ExportOptions["dateRange"];

export function DataSection() {
    const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);

    // Export options state
    const [includeIncomeEntries, setIncludeIncomeEntries] = React.useState(true);
    const [includeCategories, setIncludeCategories] = React.useState(true);
    const [dateRange, setDateRange] = React.useState<DateRange>("all");
    const [customStartDate, setCustomStartDate] = React.useState("");
    const [customEndDate, setCustomEndDate] = React.useState("");

    const handleExport = async () => {
        if (!includeIncomeEntries && !includeCategories) {
            toast.error("יש לבחור לפחות סוג נתונים אחד לייצוא");
            return;
        }

        if (dateRange === "custom" && (!customStartDate || !customEndDate)) {
            toast.error("יש להזין תאריך התחלה וסיום");
            return;
        }

        setIsExporting(true);

        try {
            const result = await exportUserData({
                includeIncomeEntries,
                includeCategories,
                dateRange,
                customStartDate: dateRange === "custom" ? customStartDate : undefined,
                customEndDate: dateRange === "custom" ? customEndDate : undefined,
            });

            if (result.success && result.csv) {
                // Create and download the file
                const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;

                // Generate filename with date
                const today = new Date().toISOString().split("T")[0];
                link.download = `seder-export-${today}.csv`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success("הקובץ הורד בהצלחה");
                setIsExportDialogOpen(false);
            } else {
                toast.error(result.error || "הייצוא נכשל");
            }
        } catch (error) {
            toast.error("שגיאה בייצוא הנתונים");
        } finally {
            setIsExporting(false);
        }
    };

    const resetForm = () => {
        setIncludeIncomeEntries(true);
        setIncludeCategories(true);
        setDateRange("all");
        setCustomStartDate("");
        setCustomEndDate("");
    };

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
                        <p className="text-sm text-muted-foreground mb-4">הורד קובץ CSV של כל ההכנסות והקטגוריות שלך</p>
                        <Dialog
                            open={isExportDialogOpen}
                            onOpenChange={(open) => {
                                setIsExportDialogOpen(open);
                                if (!open) resetForm();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">ייצוא ל-CSV</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>ייצוא נתונים</DialogTitle>
                                    <DialogDescription>
                                        בחר את הנתונים שברצונך לייצא ואת טווח התאריכים
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-6 py-4">
                                    {/* Data types to export */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">מה לייצא</Label>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={includeIncomeEntries}
                                                    onChange={(e) => setIncludeIncomeEntries(e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm">הכנסות</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={includeCategories}
                                                    onChange={(e) => setIncludeCategories(e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm">קטגוריות</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Date range */}
                                    {includeIncomeEntries && (
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">טווח תאריכים</Label>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="dateRange"
                                                        checked={dateRange === "all"}
                                                        onChange={() => setDateRange("all")}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-sm">הכל</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="dateRange"
                                                        checked={dateRange === "thisYear"}
                                                        onChange={() => setDateRange("thisYear")}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-sm">השנה הנוכחית</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="dateRange"
                                                        checked={dateRange === "thisMonth"}
                                                        onChange={() => setDateRange("thisMonth")}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-sm">החודש הנוכחי</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="dateRange"
                                                        checked={dateRange === "custom"}
                                                        onChange={() => setDateRange("custom")}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-sm">טווח מותאם אישית</span>
                                                </label>
                                            </div>

                                            {dateRange === "custom" && (
                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="startDate" className="text-xs">מתאריך</Label>
                                                        <Input
                                                            id="startDate"
                                                            type="date"
                                                            value={customStartDate}
                                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="endDate" className="text-xs">עד תאריך</Label>
                                                        <Input
                                                            id="endDate"
                                                            type="date"
                                                            value={customEndDate}
                                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsExportDialogOpen(false)}
                                    >
                                        ביטול
                                    </Button>
                                    <Button
                                        onClick={handleExport}
                                        disabled={isExporting || (!includeIncomeEntries && !includeCategories)}
                                    >
                                        {isExporting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                        ייצוא
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
