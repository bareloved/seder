"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  categoryColors,
  type CategoryColor,
  colorSchemes,
} from "../schemas";

interface ColorPickerProps {
  value: CategoryColor;
  onChange: (color: CategoryColor) => void;
  className?: string;
}

// Solid background colors for the picker (more vivid for selection)
const colorPickerBg: Record<CategoryColor, string> = {
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categoryColors.map((color) => {
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              "flex items-center justify-center",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
              colorPickerBg[color],
              isSelected && "ring-2 ring-offset-2 ring-slate-900 dark:ring-white"
            )}
            aria-label={`בחר צבע ${color}`}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <Check className="h-4 w-4 text-white drop-shadow-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
