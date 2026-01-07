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
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ניהול קטגוריות</DialogTitle>
          <DialogDescription>
            התאם את הקטגוריות לצרכיך. גרור לשינוי סדר.
          </DialogDescription>
        </DialogHeader>
        <CategoryManager initialCategories={initialCategories} hideHeader />
      </DialogContent>
    </Dialog>
  );
}
