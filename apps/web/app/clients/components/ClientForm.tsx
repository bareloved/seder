"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Mail, Phone, FileText, DollarSign } from "lucide-react";
import type { ClientWithAnalytics } from "../types";

type ClientFormSubmitData = {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | null;
};

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientWithAnalytics | null;
  onSubmit: (data: ClientFormSubmitData) => Promise<{ success: boolean; error?: string }>;
}

export function ClientForm({ isOpen, onClose, client, onSubmit }: ClientFormProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [defaultRate, setDefaultRate] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes or client changes
  React.useEffect(() => {
    if (isOpen) {
      if (client) {
        setName(client.name);
        setEmail(client.email || "");
        setPhone(client.phone || "");
        setNotes(client.notes || "");
        setDefaultRate(client.defaultRate ? parseFloat(client.defaultRate).toString() : "");
      } else {
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
        setDefaultRate("");
      }
      setError(null);
    }
  }, [isOpen, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await onSubmit({
        id: client?.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        defaultRate: defaultRate ? parseFloat(defaultRate) : null,
      });

      if (!result.success) {
        setError(result.error || "אירעה שגיאה");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!client;
  const title = isEditing ? "עריכת לקוח" : "לקוח חדש";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? "עריכת פרטי לקוח קיים" : "הוספת לקוח חדש למערכת"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                שם הלקוח
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הזן שם לקוח..."
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                טלפון
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* Default Rate */}
            <div className="space-y-2">
              <Label htmlFor="defaultRate" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                תעריף ברירת מחדל
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  ₪
                </span>
                <Input
                  id="defaultRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  placeholder="0"
                  className="pl-8 text-left"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-slate-500">
                יוזן אוטומטית בעת הוספת עבודה ללקוח זה
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                הערות
              </Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות..."
                className="w-full h-20 text-sm p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  {isEditing ? "שומר..." : "יוצר..."}
                </>
              ) : isEditing ? (
                "שמור שינויים"
              ) : (
                "צור לקוח"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
