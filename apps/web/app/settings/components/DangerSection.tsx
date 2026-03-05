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
import { deleteUserAccount } from "../actions";

const CONFIRMATION_TEXT = "DELETE";

export function DangerSection() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isConfirmed = confirmation === CONFIRMATION_TEXT;

    const handleDelete = async () => {
        if (!isConfirmed) return;

        setIsLoading(true);

        try {
            const result = await deleteUserAccount();

            if (result.success) {
                await authClient.signOut();
                router.push("/");
            } else {
                toast.error(result.error || "מחיקת החשבון נכשלה");
            }
        } catch {
            toast.error("אירעה שגיאה בלתי צפויה");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setConfirmation("");
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
                                <label htmlFor="confirmation" className="text-sm font-medium">
                                    הקלד <span className="font-mono font-bold">{CONFIRMATION_TEXT}</span> לאישור
                                </label>
                                <Input
                                    id="confirmation"
                                    type="text"
                                    dir="ltr"
                                    value={confirmation}
                                    onChange={(e) => setConfirmation(e.target.value)}
                                    placeholder={CONFIRMATION_TEXT}
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isLoading}>ביטול</AlertDialogCancel>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isLoading || !isConfirmed}
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
