import { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import type { IncomeEntry, FilterType } from "@seder/shared";
import { useIncomeMutations } from "../../../hooks/useIncomeMutations";
import { MonthSelector, HEBREW_MONTHS, parseMonth } from "../../../components/income/MonthSelector";
import { KPIRow } from "../../../components/income/KPIRow";
import { IncomeEntryCard } from "../../../components/income/IncomeEntryCard";
import { SkeletonIncomeCard } from "../../../components/Skeleton";
import { CalendarImportModal } from "../../../components/calendar/CalendarImportModal";
import { EditIncomeModal } from "../../../components/income/EditIncomeModal";
import { FilterModal } from "../../../components/income/FilterModal";
import { AddIncomeModal } from "../../../components/income/AddIncomeModal";
import type { SortColumn, SortDirection } from "../../../components/income/FilterModal";
import { useIncomeEntries, useIncomeKPIs } from "../../../hooks/useIncomeEntries";
import { useCategories } from "../../../hooks/useCategories";
import { useClients } from "../../../hooks/useClients";
import type { Category, Client } from "@seder/shared";
import {
  colors,
  darkColors,
  fonts,
  spacing,
  typography,
  shadows,
  rtlRow,
  borderRadius,
} from "../../../lib/theme";
import { useDarkMode } from "../../../providers/DarkModeProvider";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Filter helpers — ported from web app utils.ts
function getWorkStatus(entry: IncomeEntry): "done" | "in_progress" {
  const d = new Date(entry.date);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t ? "done" : "in_progress";
}

function getMoneyStatus(entry: IncomeEntry): "no_invoice" | "invoice_sent" | "paid" {
  if (entry.invoiceStatus === "cancelled") return "no_invoice";
  if (entry.paymentStatus === "paid" || entry.invoiceStatus === "paid") return "paid";
  if (entry.invoiceStatus === "sent") return "invoice_sent";
  return "no_invoice";
}

export default function IncomeScreen() {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const [month, setMonth] = useState(getCurrentMonth);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { data: entriesData, isLoading, refetch } = useIncomeEntries(month);
  const { data: kpiData, isLoading: kpiLoading } = useIncomeKPIs(month);
  const { remove } = useIncomeMutations();
  const [refreshing, setRefreshing] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: categoriesData } = useCategories();
  const { data: clientsData } = useClients();
  const allCategories: Category[] = (categoriesData?.data ?? []).filter((c: Category) => !c.isArchived);
  const allClients: Client[] = clientsData?.data ?? [];

  const entries = entriesData?.data ?? [];
  const kpis = kpiData?.data;
  const { year, m } = parseMonth(month);
  const monthLabel = HEBREW_MONTHS[m - 1];

  const hasActiveFilters = selectedCategories.length > 0 || selectedClient !== "all" || searchQuery.trim().length > 0;

  const filteredEntries = useMemo(() => {
    let result = entries;

    // KPI filter chips
    switch (activeFilter) {
      case "ready-to-invoice":
        result = result.filter(
          (e) => getWorkStatus(e) === "done" && getMoneyStatus(e) === "no_invoice"
        );
        break;
      case "invoiced":
        result = result.filter((e) => getMoneyStatus(e) === "invoice_sent");
        break;
      case "paid":
        result = result.filter((e) => getMoneyStatus(e) === "paid");
        break;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) =>
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.clientName ?? "").toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter((e) => e.categoryId && selectedCategories.includes(e.categoryId));
    }

    // Client filter
    if (selectedClient !== "all") {
      result = result.filter((e) => e.clientId === selectedClient);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "date":
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "description":
          cmp = (a.description ?? "").localeCompare(b.description ?? "", "he");
          break;
        case "amount":
          cmp = (a.amountGross ?? 0) - (b.amountGross ?? 0);
          break;
        case "category":
          cmp = (a.categoryId ?? "").localeCompare(b.categoryId ?? "");
          break;
        case "status":
          cmp = (a.invoiceStatus ?? "").localeCompare(b.invoiceStatus ?? "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [entries, activeFilter, searchQuery, selectedCategories, selectedClient, sortColumn, sortDirection]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleEdit = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const found = entries.find((e) => e.id === id);
    if (found) setEditingEntry(found);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("מחיקת הכנסה", "האם למחוק את ההכנסה?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("שגיאה", "לא ניתן למחוק");
          }
        },
      },
    ]);
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.backgroundSecondary }]}>
      <MonthSelector
        currentMonth={month}
        onMonthChange={setMonth}
        onImportPress={() => setImportModalVisible(true)}
        onFilterPress={() => setFilterModalVisible(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <View style={[styles.filterChipBar, { backgroundColor: c.backgroundSecondary }]}>
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchQuery("");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.filterChipText}>"{searchQuery.trim()}"</Text>
              <SymbolView name="xmark" tintColor={colors.textMuted} size={10} />
            </TouchableOpacity>
          )}
          {selectedCategories.map((catId) => {
            const cat = allCategories.find((c) => c.id === catId);
            if (!cat) return null;
            return (
              <TouchableOpacity
                key={catId}
                style={styles.filterChip}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategories((prev) => prev.filter((id) => id !== catId));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.filterChipText}>{cat.name}</Text>
                <SymbolView name="xmark" tintColor={colors.textMuted} size={10} />
              </TouchableOpacity>
            );
          })}
          {selectedClient !== "all" && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedClient("all");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.filterChipText}>
                {allClients.find((c) => c.id === selectedClient)?.name ?? "לקוח"}
              </Text>
              <SymbolView name="xmark" tintColor={colors.textMuted} size={10} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchQuery("");
              setSelectedCategories([]);
              setSelectedClient("all");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearAllText}>נקה הכל</Text>
          </TouchableOpacity>
        </View>
      )}

      <KPIRow
        data={kpis}
        isLoading={kpiLoading}
        monthLabel={monthLabel}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {isLoading && !refreshing ? (
        <View style={styles.skeletonList}>
          <SkeletonIncomeCard />
          <SkeletonIncomeCard />
          <SkeletonIncomeCard />
          <SkeletonIncomeCard />
          <SkeletonIncomeCard />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncomeEntryCard entry={item} onEdit={handleEdit} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SymbolView
                name="doc.text"
                tintColor={colors.textLight}
                size={44}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {activeFilter === "all"
                  ? "אין הכנסות לחודש זה"
                  : "אין הכנסות בסינון זה"}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === "all"
                  ? "לחץ על + כדי להוסיף הכנסה חדשה"
                  : "נסה לשנות את הסינון"}
              </Text>
            </View>
          }
          ListFooterComponent={
            filteredEntries.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerLinks}>
                  הצהרת נגישות  |  מדיניות פרטיות  |  תנאי שימוש
                </Text>
                <Text style={styles.footerCopyright}>© 2026 סדר</Text>
              </View>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <SymbolView name="plus" tintColor={colors.white} size={24} />
      </TouchableOpacity>

      <CalendarImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        defaultYear={year}
        defaultMonth={m}
      />

      <EditIncomeModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSaved={refetch}
      />

      <AddIncomeModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSaved={refetch}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategories={selectedCategories}
        onCategoryChange={setSelectedCategories}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={(col, dir) => { setSortColumn(col); setSortDirection(dir); }}
        onApply={() => setFilterModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: 100,
    gap: 2,
  },
  skeletonList: {
    paddingTop: spacing.xs,
    gap: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerLinks: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textLight,
    textAlign: "center",
  },
  footerCopyright: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.lg,
  },
  filterChipBar: {
    flexDirection: rtlRow,
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  filterChip: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  filterChipText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.brandDark,
  },
  clearAllChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  clearAllText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
});
