"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  FileText,
  User,
  Tag,
  X,
  Loader2,
  Trash2,
} from "lucide-react";

interface BatchActionBarProps {
  selectedCount: number;
  onMarkAsPaid: () => void;
  onMarkInvoiceSent: () => void;
  onChangeClient: () => void;
  onChangeCategory: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export function BatchActionBar({
  selectedCount,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onChangeClient,
  onChangeCategory,
  onDelete,
  onClearSelection,
  isLoading = false,
}: BatchActionBarProps) {
  const isVisible = selectedCount > 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4" dir="rtl">
            {/* Right side: Selected count */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                נבחרו {selectedCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 px-2 text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4 ml-1" />
                נקה
              </Button>
            </div>

            {/* Left side: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Mark as Paid */}
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAsPaid}
                disabled={isLoading}
                className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">סמן כשולם</span>
                <span className="sm:hidden">שולם</span>
              </Button>

              {/* Mark Invoice Sent */}
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkInvoiceSent}
                disabled={isLoading}
                className="h-9 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">נשלחה חשבונית</span>
                <span className="sm:hidden">נשלחה</span>
              </Button>

              {/* Change Client */}
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeClient}
                disabled={isLoading}
                className="h-9 gap-2 hidden sm:flex"
              >
                <User className="h-4 w-4" />
                שנה לקוח
              </Button>

              {/* Change Category */}
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeCategory}
                disabled={isLoading}
                className="h-9 gap-2 hidden sm:flex"
              >
                <Tag className="h-4 w-4" />
                שנה קטגוריה
              </Button>

              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={isLoading}
                className="h-9 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">מחק</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
