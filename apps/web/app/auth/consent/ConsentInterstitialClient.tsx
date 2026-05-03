"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

type Props = {
  nextPath: string;
  cameFromOAuth: boolean;
};

export default function ConsentInterstitialClient({ nextPath, cameFromOAuth }: Props) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/me/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          termsAccepted: true,
          marketingOptIn,
          source: cameFromOAuth ? "signup_google" : "consent_banner",
        }),
      });
      if (!res.ok) {
        throw new Error("submit failed");
      }
      // Cookie was set by the API response → middleware will let us through.
      router.replace(nextPath || "/income");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("השמירה נכשלה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background p-4"
    >
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          רק רגע לפני שנתחיל
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          תוכל/י לסמן רק את מה שמתאים לך — ההסכמה לדיוור היא בחירה נפרדת.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <Checkbox
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
              className="mt-0.5"
              aria-required="true"
            />
            <span>
              אני מאשר/ת את{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#2ecc71]"
              >
                תנאי השימוש
              </a>
              {" "}ו
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#2ecc71]"
              >
                מדיניות הפרטיות
              </a>
              <span className="text-red-500 ms-1">*</span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <Checkbox
              checked={marketingOptIn}
              onCheckedChange={(v) => setMarketingOptIn(v === true)}
              className="mt-0.5"
            />
            <span>
              אני מסכים/ה לקבל עדכונים שיווקיים ודיוור במייל. ניתן להסיר בכל עת.
            </span>
          </label>

          <Button
            type="submit"
            className="w-full h-11 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-medium"
            disabled={!termsAccepted || submitting}
          >
            {submitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            המשך
          </Button>
        </form>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
          ניתן לשנות את העדפות הדיוור בכל עת בעמוד ההגדרות.
        </p>
      </div>
    </div>
  );
}
