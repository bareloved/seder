"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import type { KPIScope, ScopeMode } from "../types";

const STORAGE_KEY = "seder-kpi-scope";

/**
 * Get current month boundaries in ISO format
 */
function getCurrentMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const lastDay = new Date(year, month, 0).getDate();

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end };
}

/**
 * Validate and normalize a KPIScope object
 */
function normalizeScope(scope: Partial<KPIScope>): KPIScope {
  const { mode = "month", start, end } = scope;

  // Month mode doesn't need start/end
  if (mode === "month") {
    return { mode: "month" };
  }

  // All-time mode doesn't need start/end
  if (mode === "all") {
    return { mode: "all" };
  }

  // Range mode requires both start and end
  if (mode === "range") {
    if (!start || !end) {
      // Fallback to current month if dates are missing
      const bounds = getCurrentMonthBounds();
      return { mode: "range", start: bounds.start, end: bounds.end };
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      // Invalid format, fallback to month mode
      return { mode: "month" };
    }

    // Auto-swap if end < start
    if (end < start) {
      return { mode: "range", start: end, end: start };
    }

    return { mode: "range", start, end };
  }

  // Invalid mode, fallback to month
  return { mode: "month" };
}

/**
 * Read scope from localStorage
 */
function getScopeFromLocalStorage(): KPIScope | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<KPIScope>;
    return normalizeScope(parsed);
  } catch {
    return null;
  }
}

/**
 * Save scope to localStorage
 */
function saveScopeToLocalStorage(scope: KPIScope): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scope));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Read scope from URL search params
 */
function getScopeFromURL(searchParams: URLSearchParams): KPIScope | null {
  const mode = searchParams.get("kpiScope") as ScopeMode | null;

  if (!mode) return null;

  const scope: Partial<KPIScope> = { mode };

  if (mode === "range") {
    const start = searchParams.get("kpiFrom");
    const end = searchParams.get("kpiTo");
    if (start) scope.start = start;
    if (end) scope.end = end;
  }

  return normalizeScope(scope);
}

/**
 * Update URL with scope parameters
 */
function updateURLWithScope(
  scope: KPIScope,
  searchParams: URLSearchParams,
  pathname: string,
  router: ReturnType<typeof useRouter>
): void {
  const params = new URLSearchParams(searchParams);

  // Set mode
  params.set("kpiScope", scope.mode);

  // Handle range-specific params
  if (scope.mode === "range" && scope.start && scope.end) {
    params.set("kpiFrom", scope.start);
    params.set("kpiTo", scope.end);
  } else {
    // Remove range params if not in range mode
    params.delete("kpiFrom");
    params.delete("kpiTo");
  }

  // Update URL without page reload
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
}

/**
 * Hook to manage KPI scope state with URL params and localStorage persistence
 */
export function useScopeState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read scope from URL, localStorage, or use default
  const scope = useMemo(() => {
    // 1. Try URL params first (highest priority)
    const urlScope = getScopeFromURL(searchParams);
    if (urlScope) return urlScope;

    // 2. Try localStorage
    const storedScope = getScopeFromLocalStorage();
    if (storedScope) return storedScope;

    // 3. Default to current month
    return { mode: "month" } as KPIScope;
  }, [searchParams]);

  // Sync to localStorage when scope changes
  useEffect(() => {
    saveScopeToLocalStorage(scope);
  }, [scope]);

  // Function to update scope
  const setScope = useCallback(
    (newScope: KPIScope) => {
      const normalized = normalizeScope(newScope);
      saveScopeToLocalStorage(normalized);
      updateURLWithScope(normalized, searchParams, pathname, router);
    },
    [searchParams, pathname, router]
  );

  return { scope, setScope };
}
