import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { MonthSelector } from "../../../components/income/MonthSelector";
import { KPICard } from "../../../components/analytics/KPICard";
import {
  useAnalyticsKPIs,
  useAnalyticsTrends,
} from "../../../hooks/useAnalytics";
import { SkeletonKPICard } from "../../../components/Skeleton";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  formatCurrency,
} from "../../../lib/theme";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const HEBREW_MONTHS_SHORT = [
  "ינו׳",
  "פבר׳",
  "מרץ",
  "אפר׳",
  "מאי",
  "יונ׳",
  "יול׳",
  "אוג׳",
  "ספט׳",
  "אוק׳",
  "נוב׳",
  "דצמ׳",
];

// ---------------------------------------------------------------------------
// KPI metric definitions
// ---------------------------------------------------------------------------

const KPI_COLORS = {
  totalGross: "#3b82f6",
  totalPaid: "#10b981",
  outstanding: "#f59e0b",
  readyToInvoice: "#8b5cf6",
} as const;

// ---------------------------------------------------------------------------
// Month status cell colors
// ---------------------------------------------------------------------------

const MONTH_STATUS_COLORS = {
  "all-paid": { bg: "#10b981", text: colors.white },
  "has-unpaid": { bg: "#f59e0b", text: colors.white },
  empty: { bg: colors.border, text: colors.textLight },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const currentMonthIndex = parseInt(month.split("-")[1]); // 1-based
  const year = parseInt(month.split("-")[0]);

  const {
    data: kpiData,
    isLoading: kpiLoading,
    refetch,
  } = useAnalyticsKPIs(month);
  const { data: trendsData } = useAnalyticsTrends(year);

  const kpis = kpiData?.data;
  const trends = trendsData?.data;

  return (
    <View style={styles.screen}>
      {/* Month selector — white bar at top */}
      <MonthSelector currentMonth={month} onMonthChange={setMonth} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} />
        }
      >
        {/* Loading state */}
        {kpiLoading ? (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCell}><SkeletonKPICard /></View>
              <View style={styles.kpiCell}><SkeletonKPICard /></View>
            </View>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCell}><SkeletonKPICard /></View>
              <View style={styles.kpiCell}><SkeletonKPICard /></View>
            </View>
          </View>
        ) : kpis ? (
          <>
            {/* ---- KPI Grid (2x2) ---- */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCell}>
                  <KPICard
                    label="סה״כ ברוטו"
                    value={formatCurrency(kpis.totalGross)}
                    subtitle={`${kpis.jobsCount} עבודות`}
                    color={KPI_COLORS.totalGross}
                    icon="banknote"
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPICard
                    label="סה״כ שולם"
                    value={formatCurrency(kpis.totalPaid)}
                    color={KPI_COLORS.totalPaid}
                    icon="checkmark.circle"
                  />
                </View>
              </View>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCell}>
                  <KPICard
                    label="ממתין לתשלום"
                    value={formatCurrency(kpis.outstanding)}
                    subtitle={`${kpis.invoicedCount} חשבוניות`}
                    color={KPI_COLORS.outstanding}
                    icon="clock"
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPICard
                    label="מוכן לחשבונית"
                    value={formatCurrency(kpis.readyToInvoice)}
                    subtitle={`${kpis.readyToInvoiceCount} עבודות`}
                    color={KPI_COLORS.readyToInvoice}
                    icon="doc.text"
                  />
                </View>
              </View>
            </View>

            {/* ---- Trend Card ---- */}
            {kpis.trend !== 0 ? (
              <View style={styles.trendCard}>
                <View style={styles.trendContent}>
                  <Text style={styles.trendLabel}>שינוי מחודש קודם</Text>
                  <View style={styles.trendValueRow}>
                    <Text
                      style={[
                        styles.trendArrow,
                        {
                          color:
                            kpis.trend > 0
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {kpis.trend > 0 ? "▲" : "▼"}
                    </Text>
                    <Text
                      style={[
                        styles.trendValue,
                        {
                          color:
                            kpis.trend > 0
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {kpis.trend > 0 ? "+" : ""}
                      {kpis.trend.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {/* ---- Monthly Status Grid ---- */}
        {trends ? (
          <View style={styles.yearSection}>
            <Text style={styles.sectionTitle}>סקירה שנתית</Text>

            <View style={styles.yearCard}>
              <Text style={styles.yearLabel}>{year}</Text>
              <View style={styles.monthsGrid}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const status = trends[m] ?? "empty";
                  const statusColors =
                    MONTH_STATUS_COLORS[
                      status as keyof typeof MONTH_STATUS_COLORS
                    ] ?? MONTH_STATUS_COLORS.empty;
                  const isCurrent = m === currentMonthIndex;

                  return (
                    <View
                      key={m}
                      style={[
                        styles.monthCell,
                        { backgroundColor: statusColors.bg },
                        isCurrent && styles.monthCellCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCellText,
                          { color: statusColors.text },
                          isCurrent && styles.monthCellTextCurrent,
                        ]}
                      >
                        {HEBREW_MONTHS_SHORT[m - 1]}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: MONTH_STATUS_COLORS["all-paid"].bg },
                    ]}
                  />
                  <Text style={styles.legendText}>שולם</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor:
                          MONTH_STATUS_COLORS["has-unpaid"].bg,
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>ממתין</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: MONTH_STATUS_COLORS.empty.bg },
                    ]}
                  />
                  <Text style={styles.legendText}>ריק</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["5xl"],
  },

  // KPI Grid (2x2)
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCell: {
    flex: 1,
  },

  // Trend Card
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: 10,
    ...shadows.sm,
  },
  trendContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendLabel: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  trendValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trendArrow: {
    fontSize: typography.sm,
  },
  trendValue: {
    fontSize: typography.xl,
    fontFamily: fonts.numbersBold,
  },

  // Yearly overview section
  yearSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  yearCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  yearLabel: {
    fontSize: typography.base,
    fontFamily: fonts.numbersSemibold,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  monthCell: {
    width: "22%",
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellCurrent: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  monthCellText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
  },
  monthCellTextCurrent: {
    fontFamily: fonts.bold,
  },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  legendText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
});
