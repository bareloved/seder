"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TouchTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  contentClassName?: string;
}

/**
 * A touch-friendly tooltip that shows on tap/press for mobile devices.
 * Uses Popover under the hood for better touch support.
 * Auto-closes after a brief delay.
 */
export function TouchTooltip({
  content,
  children,
  side = "top",
  className,
  contentClassName,
}: TouchTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (newOpen) {
      setOpen(true);
      // Auto-close after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 2000);
    } else {
      setOpen(false);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild className={className}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        sideOffset={4}
        className={cn(
          "px-2 py-1 text-xs bg-slate-800 text-white border-0 rounded shadow-lg w-auto max-w-[200px]",
          contentClassName
        )}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
