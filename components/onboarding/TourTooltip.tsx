"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep } from "./types";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TourTooltipProps {
  step: TourStep;
  targetRect: DOMRect | null;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onSecondaryAction?: () => void;
  isLastStep: boolean;
}

function calculatePosition(
  targetRect: DOMRect | null,
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number; position: TooltipPosition } {
  if (!targetRect) {
    // Center for modal-type steps
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - tooltipWidth / 2,
      position: "bottom",
    };
  }

  const margin = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Try positioning below first
  const belowSpace = viewportHeight - targetRect.bottom;
  if (belowSpace >= tooltipHeight + margin) {
    return {
      top: targetRect.bottom + margin,
      left: Math.max(
        margin,
        Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          viewportWidth - tooltipWidth - margin
        )
      ),
      position: "bottom",
    };
  }

  // Try positioning above
  const aboveSpace = targetRect.top;
  if (aboveSpace >= tooltipHeight + margin) {
    return {
      top: targetRect.top - tooltipHeight - margin,
      left: Math.max(
        margin,
        Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          viewportWidth - tooltipWidth - margin
        )
      ),
      position: "top",
    };
  }

  // Try positioning to the left (RTL-aware)
  const leftSpace = viewportWidth - targetRect.right;
  if (leftSpace >= tooltipWidth + margin) {
    return {
      top: Math.max(
        margin,
        Math.min(
          targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          viewportHeight - tooltipHeight - margin
        )
      ),
      left: targetRect.right + margin,
      position: "left",
    };
  }

  // Position to the right as fallback
  return {
    top: Math.max(
      margin,
      Math.min(
        targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        viewportHeight - tooltipHeight - margin
      )
    ),
    left: Math.max(margin, targetRect.left - tooltipWidth - margin),
    position: "right",
  };
}

export function TourTooltip({
  step,
  targetRect,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onSecondaryAction,
  isLastStep,
}: TourTooltipProps) {
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0, position: "bottom" as TooltipPosition });

  // Estimate tooltip dimensions
  const TOOLTIP_WIDTH = 320;
  const TOOLTIP_HEIGHT = 200;

  React.useEffect(() => {
    const updatePosition = () => {
      const pos = calculatePosition(targetRect, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);
      setPosition(pos);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [targetRect]);

  const isModal = step.type === "modal";

  return (
    <div
      ref={tooltipRef}
      dir="rtl"
      className={cn(
        "fixed z-[62] bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-[320px] max-w-[calc(100vw-32px)]",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        isModal && "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === currentStep
                ? "w-6 bg-emerald-500"
                : i < currentStep
                ? "w-1.5 bg-emerald-300"
                : "w-1.5 bg-slate-200 dark:bg-slate-600"
            )}
          />
        ))}
        <span className="text-xs text-slate-400 mr-auto">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Content */}
      <h3
        id="tour-title"
        className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2"
      >
        {step.title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
        {step.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onNext}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {step.action || (isLastStep ? "סיום" : "הבא")}
        </Button>

        {step.secondaryAction && onSecondaryAction && (
          <Button
            variant="ghost"
            onClick={onSecondaryAction}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {step.secondaryAction}
          </Button>
        )}

        {!isLastStep && !step.secondaryAction && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-sm"
          >
            דלג
          </Button>
        )}
      </div>
    </div>
  );
}
