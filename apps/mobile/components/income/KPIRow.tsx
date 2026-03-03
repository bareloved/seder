import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { IncomeAggregates } from "@seder/shared";

interface KPIRowProps {
  data: IncomeAggregates | undefined;
  isLoading: boolean;
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

export function KPIRow({ data, isLoading }: KPIRowProps) {
  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <KPICard
        label="סה״כ שולם"
        value={formatCurrency(data.totalPaid)}
        color="#10b981"
      />
      <KPICard
        label="ממתין לתשלום"
        value={formatCurrency(data.outstanding)}
        color="#f59e0b"
      />
      <KPICard
        label="לחשבונית"
        value={`${data.readyToInvoiceCount}`}
        color="#3b82f6"
      />
      <KPICard
        label="באיחור"
        value={`${data.overdueCount}`}
        color="#ef4444"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    minWidth: 110,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  cardLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
