"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Bug, Lightbulb, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categories = [
  { id: "general", label: "משוב כללי", icon: MessageCircle },
  { id: "bug", label: "דיווח באג", icon: Bug },
  { id: "feature", label: "בקשת פיצ׳ר", icon: Lightbulb },
] as const;

export function FeedbackModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, platform: "web", category }),
      });
      if (res.ok) {
        toast.success("המשוב נשלח בהצלחה!");
        setMessage("");
        setCategory("general");
        setOpen(false);
      } else {
        toast.error("שגיאה בשליחת המשוב");
      }
    } catch {
      toast.error("שגיאה בשליחת המשוב");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#2ecc71]" />
            </div>
            <DialogHeader className="space-y-1 text-center">
              <DialogTitle className="text-lg font-semibold">נשמח לשמוע מכם!</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                המשוב שלכם עוזר לנו לשפר את האפליקציה
              </p>
            </DialogHeader>
          </div>

          {/* Category Picker */}
          <div className="flex gap-2">
            {categories.map((cat) => {
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                    isActive
                      ? "bg-emerald-50 text-[#2ecc71] border-[#2ecc71]/40 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/40"
                      : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 dark:bg-muted dark:text-slate-400 dark:hover:bg-muted/80"
                  )}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Text Input */}
          <Textarea
            dir="rtl"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
            placeholder="ספרו לנו מה אתם חושבים..."
            className="min-h-[140px] resize-none text-base bg-slate-50 dark:bg-muted border-slate-200 dark:border-border rounded-xl"
          />

          {/* Character Count */}
          <p className={cn(
            "text-xs text-end",
            message.length > 4500 ? "text-red-500" : "text-slate-400"
          )}>
            {message.length}/5000
          </p>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full h-12 rounded-xl bg-[#2ecc71] hover:bg-[#27ae60] text-white text-base font-semibold gap-2 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "שולח..." : "שליחת משוב"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
