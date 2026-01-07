"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Category } from "@/db/schema";
import { getCategoryColorScheme, getIconByName } from "../schemas";

interface SortableCategoryProps {
  category: Category;
  onEdit: (category: Category) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
}

export function SortableCategory({
  category,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  disabled = false,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorScheme = getCategoryColorScheme(category.color);
  const IconComponent = getIconByName(category.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 transition-all",
        "border-slate-200 dark:border-slate-800",
        isDragging && "shadow-lg z-10 opacity-90",
        category.isArchived && "opacity-60",
        disabled && "cursor-default"
      )}
    >
      {/* Drag Handle */}
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing",
            "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          )}
          aria-label="גרור לשינוי סדר"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* Category Preview */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border",
          colorScheme.bg,
          colorScheme.text,
          colorScheme.border
        )}
      >
        <IconComponent className="h-4 w-4" />
        <span className="font-medium text-sm">{category.name}</span>
      </div>

      {/* Archive badge */}
      {category.isArchived && (
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          ארכיון
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="ערוך קטגוריה"
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {category.isArchived ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUnarchive(category.id)}
            className="h-8 w-8 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            aria-label="שחזר מארכיון"
          >
            <ArchiveRestore className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onArchive(category.id)}
            className="h-8 w-8 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
            aria-label="העבר לארכיון"
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}

        {/* Delete - only for archived categories, with confirmation */}
        {category.isArchived && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                aria-label="מחק קטגוריה"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
                <AlertDialogDescription>
                  האם למחוק את הקטגוריה &quot;{category.name}&quot; לצמיתות?
                  פעולה זו אינה ניתנת לביטול.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  מחק לצמיתות
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
