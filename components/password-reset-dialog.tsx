"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Loader2, CheckCircle2, ArrowRight, Mail, KeyRound, Lock } from "lucide-react";

type Step = "email" | "otp" | "password" | "success";

interface PasswordResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordResetDialog({ isOpen, onClose }: PasswordResetDialogProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const resetState = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setIsLoading(false);
    setCanResend(false);
    setResendCountdown(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const startResendCountdown = () => {
    setCanResend(false);
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });

      if (result.error) {
        setError("לא הצלחנו לשלוח את הקוד. בדקו את כתובת האימייל.");
        setIsLoading(false);
        return;
      }

      setStep("otp");
      startResendCountdown();
    } catch {
      setError("לא הצלחנו לשלוח את הקוד. בדקו את כתובת האימייל.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });

      if (result.error) {
        if (result.error.code === "TOO_MANY_REQUESTS") {
          setError("נסיונות רבים מדי. המתינו מספר דקות ונסו שוב.");
        } else {
          setError("לא הצלחנו לשלוח את הקוד. נסו שוב.");
        }
        setIsLoading(false);
        return;
      }

      startResendCountdown();
    } catch {
      setError("לא הצלחנו לשלוח את הקוד. נסו שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (otp.length !== 6) {
      setError("הקוד חייב להכיל 6 ספרות");
      setIsLoading(false);
      return;
    }

    // Move to password step - OTP will be verified during password reset
    setStep("password");
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (result.error) {
        if (result.error.code === "INVALID_OTP") {
          setError("קוד שגוי. בדקו את הקוד ונסו שוב.");
          setStep("otp");
          setOtp("");
        } else if (result.error.code === "OTP_EXPIRED") {
          setError("הקוד פג תוקף. נסו לשלוח קוד חדש.");
          setStep("otp");
          setOtp("");
          setCanResend(true);
        } else {
          setError("לא הצלחנו לאפס את הסיסמה. נסו שוב.");
        }
        setIsLoading(false);
        return;
      }

      setStep("success");
    } catch {
      setError("לא הצלחנו לאפס את הסיסמה. נסו שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        {step === "email" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Mail className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <DialogTitle className="text-center">איפוס סיסמה</DialogTitle>
              <DialogDescription className="text-center">
                הזינו את כתובת האימייל שלכם ונשלח לכם קוד לאיפוס הסיסמה
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendOtp} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  אימייל
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-left"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "שליחת קוד"
                )}
              </Button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <DialogTitle className="text-center">הזינו את הקוד</DialogTitle>
              <DialogDescription className="text-center">
                שלחנו קוד בן 6 ספרות לכתובת
                <br />
                <span className="font-medium text-slate-700 dark:text-slate-300" dir="ltr">{email}</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleVerifyOtp} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="otp-code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  קוד אימות
                </label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-medium"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "המשך"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || isLoading}
                  className="text-sm text-slate-500 hover:text-[#2ecc71] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0
                    ? `שליחה חוזרת בעוד ${resendCountdown} שניות`
                    : "שליחת קוד חדש"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                שינוי כתובת אימייל
              </button>
            </form>
          </>
        )}

        {step === "password" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Lock className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <DialogTitle className="text-center">סיסמה חדשה</DialogTitle>
              <DialogDescription className="text-center">
                הזינו סיסמה חדשה לחשבון שלכם
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  סיסמה חדשה
                </label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-left"
                  dir="ltr"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="text-xs text-slate-500">לפחות 8 תווים</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  אימות סיסמה
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 text-left"
                  dir="ltr"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "איפוס סיסמה"
                )}
              </Button>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center">הסיסמה שונתה בהצלחה!</DialogTitle>
              <DialogDescription className="text-center">
                תוכלו כעת להתחבר עם הסיסמה החדשה שלכם
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Button
                onClick={handleClose}
                className="w-full h-11 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-medium"
              >
                חזרה להתחברות
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
