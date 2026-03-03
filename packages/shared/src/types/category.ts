// Category — platform-agnostic representation
export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  displayOrder: number | string; // DB returns string for numeric columns
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Available colors for categories
export const categoryColors = [
  "emerald",
  "indigo",
  "sky",
  "amber",
  "purple",
  "slate",
  "blue",
  "rose",
  "teal",
  "orange",
  "pink",
  "cyan",
] as const;

export type CategoryColor = (typeof categoryColors)[number];

// Available icons for categories (Lucide icon names)
export const categoryIcons = [
  "Sparkles",
  "SlidersHorizontal",
  "Mic2",
  "BookOpen",
  "Layers",
  "Circle",
  "Music",
  "Headphones",
  "Guitar",
  "Piano",
  "Drum",
  "Radio",
  "Video",
  "Camera",
  "Briefcase",
  "GraduationCap",
  "Users",
  "Calendar",
  "Star",
  "Heart",
  "Zap",
  "Trophy",
] as const;

export type CategoryIcon = (typeof categoryIcons)[number];
