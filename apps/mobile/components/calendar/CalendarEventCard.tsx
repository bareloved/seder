import { View, Text, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  rtlRow,
} from "../../lib/theme";

const HEBREW_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface CalendarEventCardProps {
  summary: string;
  date: string;
  startTime?: string;
  endTime?: string;
  alreadyImported: boolean;
}

export function CalendarEventCard({
  summary,
  date,
  startTime,
  endTime,
  alreadyImported,
}: CalendarEventCardProps) {
  const d = new Date(date);
  const dayNum = d.getDate();
  const weekday = HEBREW_WEEKDAYS[d.getDay()];

  return (
    <View
      style={[styles.card, alreadyImported && styles.importedCard]}
    >
      {/* Date box on right side */}
      <View style={styles.dateBox}>
        <Text style={[styles.dateDay, alreadyImported && styles.importedText]}>
          {dayNum}
        </Text>
        <Text style={styles.dateWeekday}>{weekday}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.summary, alreadyImported && styles.importedText]}
          numberOfLines={1}
        >
          {summary}
        </Text>
        {startTime ? (
          <Text style={styles.time}>
            {startTime}
            {endTime ? ` - ${endTime}` : ""}
          </Text>
        ) : null}
      </View>

      {/* Imported badge with icon */}
      {alreadyImported ? (
        <View style={styles.badge}>
          <SymbolView
            name="checkmark.circle"
            tintColor={colors.brandDark}
            size={12}
          />
          <Text style={styles.badgeText}>יובא</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: rtlRow,
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  importedCard: {
    opacity: 0.55,
  },
  dateBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    minWidth: 42,
  },
  dateDay: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersSemibold,
    color: colors.text,
    lineHeight: 22,
  },
  dateWeekday: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  content: {
    flex: 1,
    alignItems: "flex-end",
  },
  summary: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: "right",
  },
  importedText: {
    color: colors.textMuted,
  },
  time: {
    fontSize: typography.sm,
    fontFamily: fonts.numbersRegular,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: rtlRow,
    alignItems: "center",
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  badgeText: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.brandDark,
  },
});
