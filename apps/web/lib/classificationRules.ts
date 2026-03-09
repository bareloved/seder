// Re-export shared classification engine
export type { ClassificationRule, RuleClassificationResult } from "@seder/shared";
export { DEFAULT_RULES, getKeywordVariations, classifyByRules } from "@seder/shared";

import { DEFAULT_RULES, type ClassificationRule } from "@seder/shared";

// Web-specific: localStorage wrappers

const RULES_STORAGE_KEY = "seder_classification_rules";

export function getUserRules(): ClassificationRule[] {
    if (typeof window === "undefined") return DEFAULT_RULES;

    try {
        const stored = localStorage.getItem(RULES_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }
    return DEFAULT_RULES;
}

export function saveUserRules(rules: ClassificationRule[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export function resetToDefaultRules(): ClassificationRule[] {
    if (typeof window !== "undefined") {
        localStorage.removeItem(RULES_STORAGE_KEY);
    }
    return DEFAULT_RULES;
}
