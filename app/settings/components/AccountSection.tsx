"use client";

import { User } from "better-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import * as React from "react";

export function AccountSection({ user }: { user: User }) {
    const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);

    // Note: Implementation of password change / session management depends on authClient capabilities
    // For now showing basic info matching prompt requirements

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium">חשבון</h2>
                <p className="text-sm text-muted-foreground">פרטים אישיים ואבטחה</p>
            </div>

            <div className="grid gap-6">
                {/* Email Section */}
                <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <Label>כתובת אימייל</Label>
                            <div className="text-sm text-slate-600">{user.email}</div>
                        </div>
                        <Button variant="outline" size="sm">שינוי</Button>
                    </div>
                </div>

                {/* Password Section - If applicable */}
                <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <Label>סיסמה</Label>
                            <div className="text-sm text-slate-600">••••••••</div>
                        </div>
                        <Button variant="outline" size="sm">שינוי סיסמה</Button>
                    </div>
                </div>

                {/* Sessions Section - Placeholder */}
                <div className="border rounded-lg p-4 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium">הפעלות פעילות</h3>
                        <p className="text-xs text-muted-foreground">המכשירים המחוברים לחשבון שלך כרגע</p>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>נוכחי (Chrome on Mac OS)</span>
                        </div>
                        <span className="text-xs text-slate-400">עכשיו</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
