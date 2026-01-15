"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function PreferencesSection() {
    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium">העדפות</h2>
                <p className="text-sm text-muted-foreground">התאמה אישית של ממשק המשתמש</p>
            </div>

            <div className="grid gap-6 max-w-xl">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>שפה</Label>
                        <Select defaultValue="he">
                            <SelectTrigger>
                                <SelectValue placeholder="בחר שפה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="he">עברית</SelectItem>
                                <SelectItem value="en">English (בקרוב)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>איזור זמן</Label>
                        <Select defaultValue="Asia/Jerusalem">
                            <SelectTrigger>
                                <SelectValue placeholder="בחר איזור זמן" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asia/Jerusalem">Asia/Jerusalem (GMT+2)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>מטבע ברירת מחדל</Label>
                            <p className="text-xs text-muted-foreground">המטבע שיוצג בברירת מחדל בהוספת עבודה חדשה</p>
                        </div>
                        <Select defaultValue="ILS">
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ILS">₪ (ILS)</SelectItem>
                                <SelectItem value="USD">$ (USD)</SelectItem>
                                <SelectItem value="EUR">€ (EUR)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button>שמור שינויים</Button>
            </div>
        </div>
    );
}
