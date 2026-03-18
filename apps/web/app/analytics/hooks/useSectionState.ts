"use client";

import { useState, useCallback, useEffect } from "react";
import type { AnalyticsSection } from "../types";

const STORAGE_KEY = "seder-analytics-sections";

const DEFAULT_EXPANDED: Record<AnalyticsSection, boolean> = {
  incomeChart: true,
  invoiceTracking: true,
  categoryBreakdown: false,
  clientBreakdown: false,
  vatSummary: false,
};

export function useSectionState() {
  const [expanded, setExpanded] = useState<Record<AnalyticsSection, boolean>>(DEFAULT_EXPANDED);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setExpanded((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
    }
  }, [expanded, hydrated]);

  const isSectionExpanded = useCallback(
    (section: AnalyticsSection) => expanded[section],
    [expanded]
  );

  const toggleSection = useCallback((section: AnalyticsSection) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  return { isSectionExpanded, toggleSection };
}
