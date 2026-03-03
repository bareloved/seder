"use client";

import * as React from "react";
import { HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpButtonProps {
  onRestartTour: () => void;
  isHidden?: boolean;
}

export function HelpButton({ onRestartTour, isHidden }: HelpButtonProps) {
  if (isHidden) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-50">
      <DropdownMenu dir="rtl">
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>עזרה</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onRestartTour} className="gap-2 cursor-pointer">
            <RotateCcw className="h-4 w-4" />
            <span>הפעל סיור מחדש</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
