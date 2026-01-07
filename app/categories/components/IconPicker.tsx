"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  categoryIcons,
  getIconByName,
  type CategoryIcon,
  colorSchemes,
  type CategoryColor,
} from "../schemas";

interface IconPickerProps {
  value: CategoryIcon;
  onChange: (icon: CategoryIcon) => void;
  /** Color context to display icons in */
  color?: CategoryColor;
  className?: string;
}

export function IconPicker({ value, onChange, color = "slate", className }: IconPickerProps) {
  const scheme = colorSchemes[color];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categoryIcons.map((iconName) => {
        const isSelected = value === iconName;
        const IconComponent = getIconByName(iconName);

        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={cn(
              "h-9 w-9 rounded-lg transition-all",
              "flex items-center justify-center relative",
              "hover:scale-105 active:scale-95",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
              "border",
              isSelected
                ? cn(scheme.bg, scheme.text, scheme.border, "ring-2 ring-slate-900 dark:ring-white")
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
            aria-label={`בחר אייקון ${iconName}`}
            aria-pressed={isSelected}
          >
            <IconComponent className="h-5 w-5" />
            {isSelected && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-white dark:text-slate-900" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
