"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";
import type { Category } from "@/db/schema";
import { getCategoryColorScheme, colorSchemes, getIconByName, type CategoryColor, type CategoryIcon } from "@/app/categories/schemas";

// Legacy visual mapping for backward compatibility during migration
const LEGACY_CATEGORY_META: Record<
  string,
  {
    color: CategoryColor;
    icon: CategoryIcon;
  }
> = {
  הופעות: { color: "emerald", icon: "Sparkles" },
  הפקה: { color: "indigo", icon: "SlidersHorizontal" },
  הקלטות: { color: "sky", icon: "Mic2" },
  הוראה: { color: "amber", icon: "BookOpen" },
  עיבודים: { color: "purple", icon: "Layers" },
  אחר: { color: "slate", icon: "Circle" },
  אולפן: { color: "blue", icon: "SlidersHorizontal" },
};

interface CategoryChipProps {
  /** New: Full category object from database */
  category?: Category | null;
  /** Legacy: String category name (for backward compatibility) */
  legacyCategory?: string | null;
  size?: "sm" | "md";
  withIcon?: boolean;
  className?: string;
}

export function CategoryChip({
  category,
  legacyCategory,
  size = "md",
  withIcon = true,
  className,
}: CategoryChipProps) {
  // Determine display values based on whether we have a category object or legacy string
  let displayName: string;
  let colorScheme: { bg: string; text: string; border: string };
  let IconComponent: React.ComponentType<{ className?: string }>;
  let isArchived = false;

  if (category) {
    // New: Using category object from database
    displayName = category.name;
    colorScheme = getCategoryColorScheme(category.color);
    IconComponent = getIconByName(category.icon);
    isArchived = category.isArchived;
  } else if (legacyCategory) {
    // Legacy: Using string category name
    displayName = legacyCategory;
    const legacyMeta = LEGACY_CATEGORY_META[legacyCategory];
    if (legacyMeta) {
      colorScheme = colorSchemes[legacyMeta.color];
      IconComponent = getIconByName(legacyMeta.icon);
    } else {
      colorScheme = getCategoryColorScheme(null);
      IconComponent = Circle;
    }
  } else {
    // No category
    displayName = "-";
    colorScheme = getCategoryColorScheme(null);
    IconComponent = Circle;
  }

  const hasCategory = category || legacyCategory;
  const textSize = size === "sm" ? "text-sm" : "text-base";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const showIcon = withIcon && hasCategory;
  // Icon keeps category color, text is normal black like other columns
  const iconColorClass = hasCategory ? colorScheme.text : "text-slate-400 dark:text-slate-500";

  const isNoCategory = !hasCategory;

  return (
    <span
      dir="rtl"
      className={cn(
        "inline-flex flex-row items-baseline gap-1.5 whitespace-nowrap",
        textSize,
        isArchived && "opacity-60",
        isNoCategory && "justify-center opacity-50",
        className
      )}
    >
      {showIcon && (
        <IconComponent className={cn(iconSize, "shrink-0 relative top-[1px]", iconColorClass)} />
      )}
      <span className={cn(
        "truncate max-w-[120px]",
        isNoCategory ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"
      )}>
        {displayName}
        {isArchived && " (ארכיון)"}
      </span>
    </span>
  );
}

// Helper to get category metadata (for use in other components)
export function getCategoryMeta(category?: Category | null, legacyCategory?: string | null) {
  if (category) {
    return {
      colorScheme: getCategoryColorScheme(category.color),
      icon: getIconByName(category.icon),
      name: category.name,
      isArchived: category.isArchived,
    };
  }

  if (legacyCategory) {
    const legacyMeta = LEGACY_CATEGORY_META[legacyCategory];
    if (legacyMeta) {
      return {
        colorScheme: colorSchemes[legacyMeta.color],
        icon: getIconByName(legacyMeta.icon),
        name: legacyCategory,
        isArchived: false,
      };
    }
  }

  return {
    colorScheme: getCategoryColorScheme(null),
    icon: Circle,
    name: "-",
    isArchived: false,
  };
}

// Re-export color scheme helper for convenience
export { getCategoryColorScheme };
