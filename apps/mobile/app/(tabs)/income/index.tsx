import { useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { MonthSelector } from "../../../components/income/MonthSelector";
import { KPIRow } from "../../../components/income/KPIRow";
import { IncomeEntryCard } from "../../../components/income/IncomeEntryCard";
import { useIncomeEntries, useIncomeKPIs } from "../../../hooks/useIncomeEntries";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncomeScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const { data: entriesData, isLoading, refetch } = useIncomeEntries(month);
  const { data: kpiData, isLoading: kpiLoading } = useIncomeKPIs(month);
  const [refreshing, setRefreshing] = useState(false);

  const entries = entriesData?.data ?? [];
  const kpis = kpiData?.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEntryPress = (id: string) => {
    router.push(`/(tabs)/income/${id}`);
  };

  const handleAddPress = () => {
    router.push("/(tabs)/income/new");
  };

  return (
    <View style={styles.container}>
      <MonthSelector currentMonth={month} onMonthChange={setMonth} />
      <KPIRow data={kpis} isLoading={kpiLoading} />

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncomeEntryCard entry={item} onPress={handleEntryPress} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>אין הכנסות לחודש זה</Text>
              <Text style={styles.emptySubtext}>
                לחץ על + כדי להוסיף הכנסה חדשה
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  list: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "400",
    marginTop: -2,
  },
});
