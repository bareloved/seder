"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { SpotlightOverlay } from "./SpotlightOverlay";
import { TourTooltip } from "./TourTooltip";
import { HelpButton } from "./HelpButton";
import { TOUR_STEPS, EXAMPLE_INCOME_ENTRY } from "./types";
import { completeOnboarding } from "@/app/settings/actions";

interface OnboardingTourProps {
  showOnboarding: boolean;
  onOpenAddDialog: (prefillData?: typeof EXAMPLE_INCOME_ENTRY) => void;
  onOpenCalendarDialog: () => void;
  isGoogleConnected: boolean;
  isDialogOpen?: boolean; // Track if add dialog is open
}

export function OnboardingTour({
  showOnboarding,
  onOpenAddDialog,
  onOpenCalendarDialog,
  isGoogleConnected,
  isDialogOpen = false,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false); // Paused while dialog is open

  // Handle SSR - only mount on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Start tour automatically if user hasn't completed onboarding
  React.useEffect(() => {
    if (showOnboarding && mounted && !isPaused) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showOnboarding, mounted, isPaused]);

  // Resume tour when dialog closes (after add-income step)
  React.useEffect(() => {
    if (isPaused && !isDialogOpen) {
      // Dialog just closed, resume tour at next step
      const timer = setTimeout(() => {
        setIsPaused(false);
        setCurrentStepIndex((prev) => prev + 1);
        setIsActive(true);
      }, 300); // Small delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [isPaused, isDialogOpen]);

  // Get effective steps - show appropriate calendar step based on connection status
  const effectiveSteps = React.useMemo(() => {
    return TOUR_STEPS.filter((step) => {
      // Show calendar-connected step only if Google is connected
      if (step.id === "calendar-connected") {
        return isGoogleConnected;
      }
      // Show calendar-not-connected step only if Google is NOT connected
      if (step.id === "calendar-not-connected") {
        return !isGoogleConnected;
      }
      return true;
    });
  }, [isGoogleConnected]);

  const currentStep = effectiveSteps[currentStepIndex];

  // Update target element rect when step changes
  React.useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const selector = currentStep.targetSelector;
      if (!selector) return;

      // For mobile, check for mobile-specific selector first
      const isMobile = window.innerWidth < 768;
      let element: Element | null = null;

      if (isMobile && selector === '[data-tour="add-button"]') {
        // Try mobile add button first
        element = document.querySelector('[data-tour="add-button-mobile"]');
      }

      if (!element) {
        element = document.querySelector(selector);
      }

      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();

    // Update on scroll and resize
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    // Also poll for element existence (in case it's rendered after mount)
    const pollInterval = setInterval(updateRect, 200);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      clearInterval(pollInterval);
    };
  }, [isActive, currentStepIndex, currentStep?.targetSelector]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  const handleNext = React.useCallback(async () => {
    const step = effectiveSteps[currentStepIndex];

    // Handle special actions for specific steps
    if (step.id === "add-income") {
      // Open add dialog with pre-filled example
      // Pause the tour - it will resume when dialog closes
      setIsActive(false);
      setIsPaused(true);
      onOpenAddDialog(EXAMPLE_INCOME_ENTRY);
      return;
    }

    if (step.id === "calendar-connected") {
      // Open calendar dialog and complete onboarding
      setIsActive(false);
      onOpenCalendarDialog();
      await completeOnboarding();
      return;
    }

    // calendar-not-connected step just continues to next step (no special action)

    // Move to next step
    if (currentStepIndex < effectiveSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour complete
      setIsActive(false);
      await completeOnboarding();
    }
  }, [currentStepIndex, effectiveSteps, onOpenAddDialog, onOpenCalendarDialog]);

  const handleSkip = React.useCallback(async () => {
    setIsActive(false);
    setIsPaused(false);
    // Treat skip as completed (won't auto-show again)
    await completeOnboarding();
  }, []);

  const handleSecondaryAction = React.useCallback(async () => {
    const step = effectiveSteps[currentStepIndex];

    if (step.id === "calendar-connected" && step.secondaryAction) {
      // "Maybe later" - skip to next step
      if (currentStepIndex < effectiveSteps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setIsActive(false);
        await completeOnboarding();
      }
    }
  }, [currentStepIndex, effectiveSteps]);

  const restartTour = React.useCallback(() => {
    setCurrentStepIndex(0);
    setIsPaused(false);
    setIsActive(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Help button - always visible when not in active tour */}
      <HelpButton onRestartTour={restartTour} isHidden={isActive || isPaused} />

      {/* Tour overlay and tooltip */}
      {isActive &&
        currentStep &&
        createPortal(
          <>
            <SpotlightOverlay
              targetRect={currentStep.type === "spotlight" ? targetRect : null}
              isVisible={true}
            />
            <TourTooltip
              step={currentStep}
              targetRect={currentStep.type === "spotlight" ? targetRect : null}
              currentStep={currentStepIndex}
              totalSteps={effectiveSteps.length}
              onNext={handleNext}
              onSkip={handleSkip}
              onSecondaryAction={
                currentStep.secondaryAction ? handleSecondaryAction : undefined
              }
              isLastStep={currentStepIndex === effectiveSteps.length - 1}
            />
          </>,
          document.body
        )}
    </>
  );
}
