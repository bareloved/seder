"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { SpotlightOverlay } from "./SpotlightOverlay";
import { TourTooltip } from "./TourTooltip";
import { HelpButton } from "./HelpButton";
import { TOUR_STEPS } from "./types";
import { completeOnboarding } from "@/app/settings/actions";

interface OnboardingTourProps {
  showOnboarding: boolean;
  isGoogleConnected: boolean;
}

export function OnboardingTour({
  showOnboarding,
  isGoogleConnected,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Handle SSR - only mount on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Start tour automatically if user hasn't completed onboarding
  React.useEffect(() => {
    if (showOnboarding && mounted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showOnboarding, mounted]);

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

      // Calendar import button is hidden on mobile - use modal mode instead
      if (isMobile && selector === '[data-tour="calendar-import"]') {
        setTargetRect(null); // Forces modal-style centered positioning
        return;
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
    // Move to next step
    if (currentStepIndex < effectiveSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour complete
      setIsActive(false);
      await completeOnboarding();
    }
  }, [currentStepIndex, effectiveSteps]);

  const handleSkip = React.useCallback(async () => {
    setIsActive(false);
    await completeOnboarding();
  }, []);

  const handleSecondaryAction = React.useCallback(async () => {
    // Skip to next step
    if (currentStepIndex < effectiveSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      await completeOnboarding();
    }
  }, [currentStepIndex, effectiveSteps]);

  const restartTour = React.useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Help button - always visible when not in active tour */}
      <HelpButton onRestartTour={restartTour} isHidden={isActive} />

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
