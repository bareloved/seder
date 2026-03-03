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
import { useAnalyticsKPIs, useAnalyticsTrends } from "../../../hooks/useAnalytics";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

const HEBREW_MONTHS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יונ׳",
  "יול׳", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

export default function AnalyticsScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const year = parseInt(month.split("-")[0]);

  const { data: kpiData, isLoading: kpiLoading, refetch } = useAnalyticsKPIs(month);
  const { data: trendsData } = useAnalyticsTrends(year);

  const kpis = kpiData?.data;
  const trends = trendsData?.data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => refetch()} />
      }
    >
      <MonthSelector currentMonth={month} onMonthChange={setMonth} />

      {kpiLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      ) : kpis ? (
        <>
          <View style={styles.grid}>
            <KPICard
              label="סה״כ ברוטו"
              value={formatCurrency(kpis.totalGross)}
              subtitle={`${kpis.jobsCount} עבודות`}
              color="#2563eb"
            />
            <KPICard
              label="סה״כ שולם"
              value={formatCurrency(kpis.totalPaid)}
              color="#10b981"
            />
            <KPICard
              label="ממתין לתשלום"
              value={formatCurrency(kpis.outstanding)}
              subtitle={`${kpis.invoicedCount} חשבוניות`}
              color="#f59e0b"
            />
            <KPICard
              label="מוכן לחשבונית"
              value={formatCurrency(kpis.readyToInvoice)}
              subtitle={`${kpis.readyToInvoiceCount} עבודות`}
              color="#8b5cf6"
            />
          </View>

          {kpis.trend !== 0 ? (
            <View style={styles.trendCard}>
              <Text style={styles.trendLabel}>שינוי מחודש קודם</Text>
              <Text
                style={[
                  styles.trendValue,
                  { color: kpis.trend > 0 ? "#10b981" : "#ef4444" },
                ]}
              >
                {kpis.trend > 0 ? "+" : ""}
                {kpis.trend.toFixed(0)}%
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {trends ? (
        <View style={styles.trendsSection}>
          <Text style={styles.sectionTitle}>סטטוס חודשי — {year}</Text>
          <View style={styles.trendsGrid}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const status = trends[m] ?? "empty";
              const bgColor =
                status === "all-paid"
                  ? "#d1fae5"
                  : status === "has-unpaid"
                    ? "#fef3c7"
                    : "#f3f4f6";
              const textColor =
                status === "all-paid"
                  ? "#065f46"
                  : status === "has-unpaid"
                    ? "#92400e"
                    : "#9ca3af";
              return (
                <View
                  key={m}
                  style={[styles.monthCell, { backgroundColor: bgColor }]}
                >
                  <Text style={[styles.monthLabel, { color: textColor }]}>
                    {HEBREW_MONTHS[m - 1]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 16,
  },
  grid: {
    padding: 12,
    gap: 10,
  },
  trendCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  trendValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  trendsSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    marginBottom: 10,
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthCell: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: "30%",
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
