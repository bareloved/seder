import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { IncomeAggregates, FilterType } from "@seder/shared";
import {
  colors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  fonts,
  shadows,
  rtlRow,
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

type SFSymbolName = SymbolViewProps["name"];

interface KPIRowProps {
  data: IncomeAggregates | undefined;
  isLoading: boolean;
  monthLabel?: string;
  activeFilter?: FilterType;
  onFilterChange?: (filter: FilterType) => void;
}

interface KPICardProps {
  title: string;
  amount: number;
  icon: SFSymbolName;
  iconColor: string;
  amountColor?: string;
  filter: FilterType;
  activeFilter: FilterType;
  onPress: (filter: FilterType) => void;
}

const RING_COLORS: Record<string, string> = {
  all: colors.text,
  "ready-to-invoice": "#0ea5e9",
  invoiced: "#f97316",
  paid: "#10b981",
};

// Mirrors web: card.amount.toLocaleString("he-IL")
function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("he-IL");
}

// Exact port of web KPICards.tsx card layout
function KPICard({ title, amount, icon, iconColor, amountColor, filter, activeFilter, onPress }: KPICardProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const isActive = activeFilter === filter;
  const ringColor = RING_COLORS[filter] ?? c.border;
  const valueColor = amountColor ?? c.text;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: c.card },
        isActive
          ? { borderWidth: 1.5, borderColor: ringColor }
          : { borderWidth: 1, borderColor: c.border },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(filter);
      }}
      activeOpacity={0.7}
    >
      {/* p-3 sm:p-4 h-full flex flex-col justify-between */}
      <View style={styles.cardContent}>
        {/* Top Right: Title + Amount */}
        <View style={styles.cardTop}>
          {/* text-sm sm:text-base text-slate-600 font-normal */}
          <Text style={[styles.cardTitle, { color: c.textMuted }]} numberOfLines={1}>
            {title}
          </Text>
          {/* text-2xl sm:text-[34px] font-normal font-numbers tracking-tight mt-1, dir="ltr" */}
          <View style={styles.amountRow}>
            <Text style={[styles.amountSymbol, { color: valueColor }]}>₪</Text>
            <Text style={[styles.amountNumber, { color: valueColor }]}> {formatNumber(amount)}</Text>
          </View>
        </View>

        {/* Bottom Left: Icon — absolute bottom-3 left-3 sm:bottom-4 left-4 */}
        <View style={styles.iconContainer}>
          <SymbolView name={icon} tintColor={iconColor} size={18} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function KPIRow({ data, isLoading, monthLabel, activeFilter = "all", onFilterChange }: KPIRowProps) {
  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }

  const handlePress = (filter: FilterType) => {
    const next = activeFilter === filter ? "all" : filter;
    onFilterChange?.(next);
  };

  // Matches web card order: total, ready-to-invoice, invoiced, paid
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <KPICard
          title={monthLabel ? `סה"כ ${monthLabel}` : `סה"כ החודש`}
          amount={data.totalGross ?? 0}
          icon="tablecells"
          iconColor={colors.textLight}
          filter="all"
          activeFilter={activeFilter}
          onPress={handlePress}
        />
        <KPICard
          title="לפני חיוב"
          amount={data.readyToInvoice ?? 0}
          icon="doc.text"
          iconColor="#0ea5e9"
          filter="ready-to-invoice"
          activeFilter={activeFilter}
          onPress={handlePress}
        />
      </View>
      <View style={styles.row}>
        <KPICard
          title="מחכה לתשלום"
          amount={data.outstanding ?? 0}
          icon="creditcard"
          iconColor="#f97316"
          filter="invoiced"
          activeFilter={activeFilter}
          onPress={handlePress}
        />
        <KPICard
          title="התקבל החודש"
          amount={data.totalPaid ?? 0}
          icon="chart.line.uptrend.xyaxis"
          iconColor="#059669"
          amountColor="#059669"
          filter="paid"
          activeFilter={activeFilter}
          onPress={handlePress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    flexDirection: rtlRow,
    gap: spacing.sm,
  },

  // Web: h-[100px] sm:h-[120px] border border-slate-100 relative overflow-hidden shadow-sm
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    height: 88,
    overflow: "hidden",
    ...shadows.sm,
  },

  // Web: p-3 h-full flex flex-col justify-between
  cardContent: {
    flex: 1,
    padding: spacing.md, // p-3 = 12px
    justifyContent: "space-between",
  },

  cardTop: {
    alignItems: "flex-end", // text-right
  },

  // Web: text-sm text-slate-600 font-normal
  cardTitle: {
    fontSize: typography.lg, // 17px
    fontFamily: fonts.regular,
    color: "#475569", // slate-600
  },

  // Web: dir="ltr" so amount flows left-to-right
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
  },

  // Web: <span className="text-base">₪</span>
  amountSymbol: {
    fontSize: typography.lg, // 17px
    fontFamily: fonts.numbersMedium,
    color: colors.text,
  },

  amountNumber: {
    fontSize: 26,
    fontFamily: fonts.numbersMedium,
    color: colors.text,
    letterSpacing: -0.5,
  },

  // Web: absolute bottom-3 left-3, h-3 w-3
  iconContainer: {
    position: "absolute",
    bottom: spacing.md, // bottom-3 = 12px
    left: spacing.md,   // left-3 = 12px
    opacity: 0.5,
  },

  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
});
