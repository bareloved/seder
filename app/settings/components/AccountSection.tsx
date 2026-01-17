"use client";

import { User } from "better-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import * as React from "react";

export function AccountSection({ user }: { user: User }) {
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);

    // Password change state
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);

    // Email change state
    const [newEmail, setNewEmail] = React.useState("");
    const [isEmailLoading, setIsEmailLoading] = React.useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("הסיסמאות לא תואמות");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
            return;
        }

        setIsPasswordLoading(true);

        try {
            const { error } = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                toast.error(error.message || "שגיאה בשינוי הסיסמה");
            } else {
                toast.success("הסיסמה שונתה בהצלחה");
                setIsPasswordDialogOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (err) {
            toast.error("שגיאה בשינוי הסיסמה");
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newEmail || !newEmail.includes("@")) {
            toast.error("אנא הזן כתובת אימייל תקינה");
            return;
        }

        if (newEmail === user.email) {
            toast.error("זו כבר כתובת האימייל הנוכחית שלך");
            return;
        }

        setIsEmailLoading(true);

        try {
            const { error } = await authClient.changeEmail({
                newEmail,
            });

            if (error) {
                toast.error(error.message || "שגיאה בשינוי האימייל");
            } else {
                toast.success("נשלח אימייל אימות לכתובת החדשה");
                setIsEmailDialogOpen(false);
                setNewEmail("");
            }
        } catch (err) {
            toast.error("שגיאה בשינוי האימייל");
        } finally {
            setIsEmailLoading(false);
        }
    };

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
                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">שינוי</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>שינוי כתובת אימייל</DialogTitle>
                                    <DialogDescription>
                                        הזן את כתובת האימייל החדשה. יישלח אליך אימייל אימות.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleEmailChange}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current-email">אימייל נוכחי</Label>
                                            <Input
                                                id="current-email"
                                                type="email"
                                                value={user.email}
                                                disabled
                                                className="bg-slate-50"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="new-email">אימייל חדש</Label>
                                            <Input
                                                id="new-email"
                                                type="email"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                placeholder="example@email.com"
                                                dir="ltr"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsEmailDialogOpen(false)}
                                        >
                                            ביטול
                                        </Button>
                                        <Button type="submit" disabled={isEmailLoading}>
                                            {isEmailLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                            שמור
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Password Section */}
                <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <Label>סיסמה</Label>
                            <div className="text-sm text-slate-600">••••••••</div>
                        </div>
                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">שינוי סיסמה</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>שינוי סיסמה</DialogTitle>
                                    <DialogDescription>
                                        הזן את הסיסמה הנוכחית והסיסמה החדשה.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handlePasswordChange}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current-password">סיסמה נוכחית</Label>
                                            <Input
                                                id="current-password"
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                dir="ltr"
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="new-password">סיסמה חדשה</Label>
                                            <Input
                                                id="new-password"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                dir="ltr"
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="confirm-password">אימות סיסמה</Label>
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                dir="ltr"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsPasswordDialogOpen(false)}
                                        >
                                            ביטול
                                        </Button>
                                        <Button type="submit" disabled={isPasswordLoading}>
                                            {isPasswordLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                            שמור
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
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
