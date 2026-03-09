import { type LucideIcon } from "lucide-react";
import {
  Sparkles,
  SlidersHorizontal,
  Mic2,
  BookOpen,
  Layers,
  Circle,
  Music,
  Headphones,
  Guitar,
  Piano,
  Drum,
  Radio,
  Video,
  Camera,
  Briefcase,
  GraduationCap,
  Users,
  Calendar,
  Star,
  Heart,
  Zap,
  Trophy,
} from "lucide-react";

// Re-export shared category data
export {
  categoryColors,
  categoryIcons,
  DEFAULT_CATEGORIES,
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from "@seder/shared";
export type {
  CategoryColor,
  CategoryIcon,
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
} from "@seder/shared";

// Web-specific: Icon component map (Lucide imports)
export const categoryIconMap: Record<string, LucideIcon> = {
  Sparkles,
  SlidersHorizontal,
  Mic2,
  BookOpen,
  Layers,
  Circle,
  Music,
  Headphones,
  Guitar,
  Piano,
  Drum,
  Radio,
  Video,
  Camera,
  Briefcase,
  GraduationCap,
  Users,
  Calendar,
  Star,
  Heart,
  Zap,
  Trophy,
};

// Helper to get icon component by name (type-safe)
export function getIconByName(iconName?: string | null): LucideIcon {
  if (!iconName) return Circle;
  if (iconName in categoryIconMap) {
    return categoryIconMap[iconName];
  }
  return Circle;
}

// Color schemes for UI rendering (Tailwind classes — web-specific)
export const colorSchemes: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-100 dark:border-emerald-800",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-100 dark:border-indigo-800",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-100 dark:border-sky-800",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-100 dark:border-amber-800",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-100 dark:border-purple-800",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-800/40",
    text: "text-slate-700 dark:text-slate-200",
    border: "border-slate-200 dark:border-slate-700",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-100 dark:border-blue-800",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-100 dark:border-rose-800",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-100 dark:border-teal-800",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-100 dark:border-orange-800",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-900/20",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-100 dark:border-pink-800",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-100 dark:border-cyan-800",
  },
};

// Default color scheme for unknown/fallback
export const defaultColorScheme = {
  bg: "bg-slate-100 dark:bg-slate-800/40",
  text: "text-slate-600 dark:text-slate-200",
  border: "border-slate-200 dark:border-slate-700",
};

// Helper to get color scheme
export function getCategoryColorScheme(color?: string | null) {
  if (color && color in colorSchemes) {
    return colorSchemes[color];
  }
  return defaultColorScheme;
}
