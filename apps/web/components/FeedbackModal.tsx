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
import { toast } from "sonner";

export function FeedbackModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, platform: "web" }),
      });
      if (res.ok) {
        toast.success("המשוב נשלח בהצלחה!");
        setMessage("");
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
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">שליחת משוב</DialogTitle>
        </DialogHeader>
        <Textarea
          dir="rtl"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ספרו לנו מה אתם חושבים..."
          className="min-h-[120px]"
        />
        <Button onClick={handleSubmit} disabled={sending || !message.trim()} className="w-full">
          {sending ? "שולח..." : "שלח משוב"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
