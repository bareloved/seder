import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { IncomeEntry } from "@seder/shared";
import {
  colors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  fonts,
  shadows,
  getInvoiceStatusStyle,
  formatCurrency,
  rtlRow,
  rtlAlignEnd,
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

type SFSymbolName = SymbolViewProps["name"];

interface IncomeEntryCardProps {
  entry: IncomeEntry;
  onPress?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const HEBREW_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function getTimingBorderColor(dateStr: string): string {
  const entryDate = new Date(dateStr);
  const today = new Date();
  entryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (entryDate.getTime() === today.getTime()) return colors.timingToday;
  if (entryDate < today) return colors.timingPast;
  return colors.timingFuture;
}

const INVOICE_ICONS: Record<string, SFSymbolName> = {
  paid: "checkmark",
  sent: "paperplane",
  draft: "doc.text",
  cancelled: "xmark",
};

export function IncomeEntryCard({ entry, onPress, onEdit, onDelete }: IncomeEntryCardProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const timingColor = getTimingBorderColor(entry.date);
  const isPaid = entry.paymentStatus === "paid";
  const invoiceStyle = getInvoiceStatusStyle(entry.invoiceStatus);
  const invoiceIcon = INVOICE_ICONS[entry.invoiceStatus] ?? INVOICE_ICONS.draft;

  const date = new Date(entry.date);
  const dayNum = date.getDate();
  const weekday = HEBREW_WEEKDAYS[date.getDay()];

  return (
    <View
      style={[styles.card, { borderLeftColor: timingColor, borderLeftWidth: 3, backgroundColor: c.card, borderColor: c.border }]}
    >
      {/* Date box — first child, appears on RIGHT in RTL row */}
      <View style={[styles.dateBox, { backgroundColor: c.backgroundTertiary }]}>
        <Text style={[styles.dateDay, { color: c.textSecondary }]}>{dayNum}</Text>
        <Text style={[styles.dateWeekday, { color: c.textLight }]}>{weekday}</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Top row: description (right) + amount (left) */}
        <View style={styles.topRow}>
          <Text style={[styles.description, { color: c.text }]} numberOfLines={2}>
            {entry.description}
          </Text>
          <Text
            style={[
              styles.amount,
              { color: isPaid ? colors.statusPaid : c.text },
            ]}
          >
            {formatCurrency(entry.amountGross)}
          </Text>
        </View>

        {/* Client name */}
        {entry.clientName ? (
          <Text style={[styles.client, { color: c.textMuted }]} numberOfLines={1}>
            {entry.clientName}
          </Text>
        ) : null}

        {/* Bottom row: category + status ... actions */}
        <View style={styles.bottomRow}>
          {/* Category chip */}
          {entry.categoryData ? (
            <View style={styles.categoryChip}>
              <SymbolView
                name="slider.horizontal.3"
                tintColor={colors.textMuted}
                size={13}
              />
              <Text style={styles.categoryText}>
                {entry.categoryData.name}
              </Text>
            </View>
          ) : null}

          {/* Invoice status badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: invoiceStyle.bg },
            ]}
          >
            <SymbolView
              name={invoiceIcon}
              tintColor={invoiceStyle.text}
              size={12}
            />
            <Text style={[styles.statusText, { color: invoiceStyle.text }]}>
              {invoiceStyle.label}
            </Text>
          </View>

          <View style={styles.spacer} />

          {/* 3-dot menu */}
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={(e) => {
              e.target.measure((_x: number, _y: number, _w: number, _h: number, pageX: number, pageY: number) => {
                setMenuPosition({ x: pageX, y: pageY + _h + 4 });
                setMenuOpen(true);
              });
            }}
          >
            <SymbolView name="ellipsis" tintColor={c.textLight} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { top: menuPosition.y, left: menuPosition.x, backgroundColor: c.card, borderColor: c.border }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); onEdit?.(entry.id); }}
            >
              <SymbolView name="square.and.pencil" tintColor={c.textSecondary} size={20} />
              <Text style={[styles.menuItemText, { color: c.text }]}>עריכה</Text>
            </TouchableOpacity>
            <View style={[styles.menuSeparator, { backgroundColor: c.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); onDelete?.(entry.id); }}
            >
              <SymbolView name="trash" tintColor={colors.danger} size={20} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>מחיקה</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: rtlRow,
    alignItems: "flex-start",
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginVertical: 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  dateBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
    minWidth: 30,
  },
  dateDay: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  dateWeekday: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textLight,
    marginTop: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  description: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: "right",
  },
  amount: {
    fontSize: typography.xl,
    fontFamily: fonts.numbersRegular,
    flexShrink: 0,
    letterSpacing: -0.3,
  },
  client: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  bottomRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: 4,
  },
  categoryText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: rtlRow,
    alignItems: "center",
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  statusText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
  },
  spacer: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
  },
  menuCard: {
    position: "absolute",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    minWidth: 140,
    ...shadows.lg,
  },
  menuItem: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
