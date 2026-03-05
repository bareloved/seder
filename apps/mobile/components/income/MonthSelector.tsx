import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import {
  colors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  fonts,
  shadows,
  rtlRowReverse,
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

interface MonthSelectorProps {
  currentMonth: string; // "2026-03" format
  onMonthChange: (month: string) => void;
  onImportPress?: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
}

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function parseMonth(month: string): { year: number; m: number } {
  const [year, m] = month.split("-").map(Number);
  return { year, m };
}

function formatMonth(year: number, m: number): string {
  return `${year}-${String(m).padStart(2, "0")}`;
}

const YEAR_RANGE_START = 2020;
const YEAR_RANGE_END = 2030;
const YEARS = Array.from(
  { length: YEAR_RANGE_END - YEAR_RANGE_START + 1 },
  (_, i) => YEAR_RANGE_START + i
);

export function MonthSelector({
  currentMonth,
  onMonthChange,
  onImportPress,
  onFilterPress,
  hasActiveFilters,
}: MonthSelectorProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const { year, m } = parseMonth(currentMonth);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const goToPrevMonth = () => {
    if (m === 1) {
      onMonthChange(formatMonth(year - 1, 12));
    } else {
      onMonthChange(formatMonth(year, m - 1));
    }
  };

  const goToNextMonth = () => {
    if (m === 12) {
      onMonthChange(formatMonth(year + 1, 1));
    } else {
      onMonthChange(formatMonth(year, m + 1));
    }
  };

  const selectYear = (y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMonthChange(formatMonth(y, m));
    setYearPickerVisible(false);
  };

  const selectMonth = (monthIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMonthChange(formatMonth(year, monthIndex));
    setMonthPickerVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.backgroundSecondary }]}>
      {/* Year button */}
      <TouchableOpacity
        style={[styles.yearBadge, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setYearPickerVisible(true);
        }}
        activeOpacity={0.6}
      >
        <Text style={[styles.yearText, { color: c.text }]}>{year}</Text>
        <SymbolView name="chevron.up.chevron.down" tintColor={colors.textMuted} size={10} />
      </TouchableOpacity>

      {/* Year picker modal */}
      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setYearPickerVisible(false)}
        >
          <View style={[styles.yearPickerCard, { backgroundColor: c.card }]}>
            <Text style={[styles.yearPickerTitle, { color: c.textMuted }]}>בחר שנה</Text>
            <FlatList
              data={YEARS}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.yearOption,
                    item === year && { backgroundColor: c.brandLight },
                  ]}
                  onPress={() => selectYear(item)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.yearOptionText,
                      { color: c.text },
                      item === year && styles.yearOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.max(0, YEARS.indexOf(year) - 2)}
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month picker modal */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <View style={[styles.monthPickerCard, { backgroundColor: c.card }]}>
            <Text style={[styles.yearPickerTitle, { color: c.textMuted }]}>בחר חודש</Text>
            <FlatList
              data={HEBREW_MONTHS}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => {
                const monthIndex = index + 1;
                const isActive = monthIndex === m;
                return (
                  <TouchableOpacity
                    style={[
                      styles.monthOption,
                      isActive && { backgroundColor: c.brandLight },
                    ]}
                    onPress={() => selectMonth(monthIndex)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        { color: c.text },
                        isActive && styles.monthOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.max(0, m - 3)}
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month selector with arrows */}
      <View style={[styles.monthControl, { backgroundColor: c.card, borderColor: c.border }]}>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.arrowButton}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SymbolView
            name="chevron.left"
            tintColor={colors.textMuted}
            size={14}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthLabelRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMonthPickerVisible(true);
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.monthDot}>{"\u25CF"}</Text>
          <Text style={[styles.monthText, { color: c.text }]}>{HEBREW_MONTHS[m - 1]}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToPrevMonth}
          style={styles.arrowButton}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SymbolView
            name="chevron.right"
            tintColor={colors.textMuted}
            size={14}
          />
        </TouchableOpacity>
      </View>

      {/* Calendar import button */}
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onImportPress?.();
        }}
        activeOpacity={0.6}
      >
        <SymbolView name="calendar.badge.plus" tintColor="#3b82f6" size={18} />
      </TouchableOpacity>

      {/* Filter button */}
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: c.card, borderColor: c.border }, hasActiveFilters && styles.iconButtonActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onFilterPress?.();
        }}
        activeOpacity={0.6}
      >
        <SymbolView
          name="line.3.horizontal.decrease"
          tintColor={hasActiveFilters ? colors.brand : colors.textMuted}
          size={18}
        />
        {hasActiveFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>
    </View>
  );
}

export { HEBREW_MONTHS, parseMonth };

const styles = StyleSheet.create({
  container: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 44,
    justifyContent: "center",
  },
  yearText: {
    fontSize: typography.base,
    fontFamily: fonts.numbersMedium,
    color: colors.text,
  },

  // Year picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  yearPickerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: 200,
    maxHeight: 340,
    padding: spacing.lg,
    ...shadows.lg,
  },
  yearPickerTitle: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  yearOption: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  yearOptionActive: {
    backgroundColor: colors.brandLight,
  },
  yearOptionText: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersMedium,
    color: colors.text,
  },
  yearOptionTextActive: {
    color: colors.brand,
    fontFamily: fonts.numbersBold,
  },
  monthPickerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: 200,
    maxHeight: 340,
    padding: spacing.lg,
    ...shadows.lg,
  },
  monthOption: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  monthOptionActive: {
    backgroundColor: colors.brandLight,
  },
  monthOptionText: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  monthOptionTextActive: {
    color: colors.brand,
    fontFamily: fonts.bold,
  },
  monthControl: {
    flexDirection: rtlRowReverse,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthDot: {
    fontSize: 8,
    color: "#ef4444",
  },
  monthText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
    minWidth: 40,
    textAlign: "center",
  },
  iconButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
});
