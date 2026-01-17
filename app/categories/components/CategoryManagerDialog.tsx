"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CategoryManager } from "./CategoryManager";
import type { Category } from "@/db/schema";

interface CategoryManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategories?: Category[];
  onCategoriesChange?: () => void;
}

export function CategoryManagerDialog({
  isOpen,
  onClose,
  initialCategories = [],
  onCategoriesChange,
}: CategoryManagerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto [&>button]:left-3 [&>button]:sm:left-4 [&>button]:right-auto">
        <DialogHeader className="text-right" dir="rtl">
          <DialogTitle className="text-base text-right">ניהול קטגוריות</DialogTitle>
          <DialogDescription className="text-xs text-right">
            התאם את הקטגוריות לצרכיך. גרור לשינוי סדר.
          </DialogDescription>
        </DialogHeader>
        <CategoryManager initialCategories={initialCategories} hideHeader />
      </DialogContent>
    </Dialog>
  );
}
