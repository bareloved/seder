"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { deleteUserAccountWithPassword } from "../actions";

export function DangerSection() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        if (!password.trim()) {
            setError("יש להזין סיסמה");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await deleteUserAccountWithPassword(password);

            if (result.success) {
                // Sign out and redirect to home
                await authClient.signOut();
                router.push("/");
            } else {
                setError(result.error || "מחיקת החשבון נכשלה");
                toast.error(result.error || "מחיקת החשבון נכשלה");
            }
        } catch {
            setError("אירעה שגיאה בלתי צפויה");
            toast.error("אירעה שגיאה בלתי צפויה");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Reset state when dialog closes
            setPassword("");
            setError("");
        }
    };

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
                    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">מחק חשבון</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    פעולה זו לא ניתנת לביטול. כל הנתונים שלך יימחקו לצמיתות, כולל הכנסות, קטגוריות, ולקוחות.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="space-y-2 py-4">
                                <label htmlFor="password" className="text-sm font-medium">
                                    הזן את הסיסמה שלך לאישור
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    dir="ltr"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="סיסמה"
                                    disabled={isLoading}
                                />
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isLoading}>ביטול</AlertDialogCancel>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isLoading || !password.trim()}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                            מוחק...
                                        </>
                                    ) : (
                                        "מחק לצמיתות"
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
