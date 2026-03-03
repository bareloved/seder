import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { IncomeEntry } from "@seder/shared";

interface IncomeEntryCardProps {
  entry: IncomeEntry;
  onPress: (id: string) => void;
}

function getStatusLabel(entry: IncomeEntry): string {
  if (entry.paymentStatus === "paid") return "שולם";
  if (entry.invoiceStatus === "sent") return "נשלחה";
  if (entry.invoiceStatus === "draft") return "טיוטה";
  return "בוצע";
}

function getStatusColor(entry: IncomeEntry): string {
  if (entry.paymentStatus === "paid") return "#10b981";
  if (entry.invoiceStatus === "sent") return "#f59e0b";
  return "#6b7280";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

export function IncomeEntryCard({ entry, onPress }: IncomeEntryCardProps) {
  const statusColor = getStatusColor(entry);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(entry.id)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.leftSection}>
          <Text style={styles.amount}>
            {formatCurrency(entry.amountGross)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(entry)}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.description} numberOfLines={1}>
            {entry.description}
          </Text>
          <View style={styles.metaRow}>
            {entry.clientName ? (
              <Text style={styles.client} numberOfLines={1}>
                {entry.clientName}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDate(entry.date)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  leftSection: {
    alignItems: "flex-start",
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  client: {
    fontSize: 13,
    color: "#6b7280",
  },
  date: {
    fontSize: 13,
    color: "#9ca3af",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
