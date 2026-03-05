import { StyleSheet } from "react-native";

// =============================================================================
// RTL helpers — RTL is forced at the native level via plugins/force-rtl.js
// so I18nManager.isRTL is always true. These are kept as semantic aliases.
// =============================================================================

/** Use for rows where first child should appear on the RIGHT (RTL order) */
export const rtlRow = "row" as const;

/** Use for rows where first child should appear on the LEFT (reverse RTL) */
export const rtlRowReverse = "row-reverse" as const;

/** Logical "start" alignment — right in RTL */
export const rtlAlignStart = "flex-start" as const;

/** Logical "end" alignment — left in RTL */
export const rtlAlignEnd = "flex-end" as const;

// =============================================================================
// Font families — matching the Seder web app
// =============================================================================

export const fonts = {
  // Body text (Hebrew) — Ploni, falling back to system
  regular: "Ploni-Regular",
  medium: "Ploni-Medium",
  semibold: "Ploni-DemiBold",
  bold: "Ploni-Bold",
  // Numbers — Montserrat (like font-numbers in the web app)
  numbersRegular: "Montserrat_400Regular",
  numbersMedium: "Montserrat_500Medium",
  numbersSemibold: "Montserrat_600SemiBold",
  numbersBold: "Montserrat_700Bold",
} as const;

// =============================================================================
// Design tokens matching the Seder web app
// =============================================================================

export const colors = {
  // Brand
  brand: "#2ecc71",
  brandDark: "#27ae60",
  brandLight: "#E8F5E9",

  // Primary (buttons, links)
  primary: "#2563eb",
  primaryDark: "#1d4ed8",

  // Backgrounds
  background: "#ffffff",
  backgroundSecondary: "#f1f5f9",
  backgroundTertiary: "#f9fafb",
  card: "#ffffff",

  // Text
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#64748b",
  textLight: "#9ca3af",

  // Borders
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  borderDark: "#cbd5e1",

  // Status - Invoice
  statusPaid: "#10b981",
  statusPaidBg: "rgba(16, 185, 129, 0.1)",
  statusSent: "#f59e0b",
  statusSentBg: "rgba(245, 158, 11, 0.1)",
  statusDraft: "#0ea5e9",
  statusDraftBg: "rgba(14, 165, 233, 0.1)",
  statusCancelled: "#ef4444",
  statusCancelledBg: "rgba(239, 68, 68, 0.1)",

  // Status - Payment
  paymentPaid: "#10b981",
  paymentPartial: "#f59e0b",
  paymentUnpaid: "#ef4444",

  // KPI colors
  kpiTotalPaid: "#10b981",
  kpiOutstanding: "#f59e0b",
  kpiReady: "#3b82f6",
  kpiOverdue: "#ef4444",

  // Timing borders (income rows)
  timingPast: "#d1d5db",
  timingToday: "transparent",
  timingFuture: "#3b82f6",

  // Misc
  danger: "#ef4444",
  dangerBg: "rgba(239, 68, 68, 0.08)",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#0ea5e9",
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Category palette
  emerald: "#10b981",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b",
} as const;

// GitHub-inspired dark theme (matching web app's .dark CSS variables)
export const darkColors = {
  ...colors,
  // Brand — keep green
  brand: "#2ecc71",
  brandDark: "#27ae60",
  brandLight: "rgba(46, 204, 113, 0.15)",

  // Backgrounds
  background: "#0d1117",
  backgroundSecondary: "#010409",
  backgroundTertiary: "#161b22",
  card: "#161b22",

  // Text
  text: "#e6edf3",
  textSecondary: "#c9d1d9",
  textMuted: "#8b949e",
  textLight: "#6e7681",

  // Borders
  border: "#30363d",
  borderLight: "#21262d",
  borderDark: "#484f58",

  // Misc
  overlay: "rgba(0, 0, 0, 0.7)",
  white: "#ffffff",
  black: "#000000",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,

  // Weights
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// =============================================================================
// Shared component styles
// =============================================================================

export const sharedStyles = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardPadding: {
    padding: spacing["2xl"],
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 44,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 44,
  },
  buttonOutlineText: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right" as const,
  },

  // Badges / Pills
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: "flex-start" as const,
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },

  // Screen container
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Section headers
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    textAlign: "right" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  // Row
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  rowBetween: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
});

// =============================================================================
// Helper to get status colors
// =============================================================================

export function getInvoiceStatusStyle(status: string) {
  switch (status) {
    case "paid":
      return { bg: colors.statusPaidBg, text: colors.statusPaid, label: "שולם" };
    case "sent":
      return { bg: colors.statusSentBg, text: colors.statusSent, label: "נשלח" };
    case "draft":
      return { bg: colors.statusDraftBg, text: colors.statusDraft, label: "טיוטה" };
    case "cancelled":
      return { bg: colors.statusCancelledBg, text: colors.statusCancelled, label: "בוטל" };
    default:
      return { bg: colors.statusDraftBg, text: colors.statusDraft, label: status };
  }
}

export function getPaymentStatusStyle(status: string) {
  switch (status) {
    case "paid":
      return { bg: colors.statusPaidBg, text: colors.statusPaid, label: "שולם" };
    case "partial":
      return { bg: colors.statusSentBg, text: colors.statusSent, label: "חלקי" };
    case "unpaid":
      return { bg: colors.statusCancelledBg, text: colors.statusCancelled, label: "לא שולם" };
    default:
      return { bg: colors.statusDraftBg, text: colors.statusDraft, label: status };
  }
}

// =============================================================================
// Dark mode hook — returns colors based on current theme
// =============================================================================

// Re-export for convenience; actual provider is in providers/DarkModeProvider
export type Colors = { [K in keyof typeof colors]: string };

export function getColors(isDark: boolean): Colors {
  return isDark ? darkColors : colors;
}

// Format currency (ILS) — matches web format: "₪ 1,000"
export function formatCurrency(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `\u20AA ${formatted}`;
}
