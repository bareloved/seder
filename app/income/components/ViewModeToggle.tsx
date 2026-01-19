"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { List, LayoutGrid } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// View Mode Toggle Component
// Allows switching between list and card views, visible on all breakpoints
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = "list" | "cards";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 p-1 bg-white dark:bg-card rounded-full border border-slate-200 dark:border-border shadow-sm",
        className
      )}
    >
      {/* List View Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange("list")}
            aria-label="תצוגת רשימה"
            aria-pressed={viewMode === "list"}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              viewMode === "list"
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 hover:bg-slate-700 dark:hover:bg-slate-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>רשימה</p>
        </TooltipContent>
      </Tooltip>

      {/* Cards View Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange("cards")}
            aria-label="תצוגת כרטיסים"
            aria-pressed={viewMode === "cards"}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              viewMode === "cards"
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 hover:bg-slate-700 dark:hover:bg-slate-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>כרטיסים</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}




