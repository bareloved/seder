import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Stack } from "expo-router";
import { MonthSelector } from "../../components/income/MonthSelector";
import { CalendarEventCard } from "../../components/calendar/CalendarEventCard";
import { SkeletonCalendarCard } from "../../components/Skeleton";
import {
  useCalendars,
  useCalendarEvents,
  useCalendarImport,
} from "../../hooks/useCalendar";
import * as Haptics from "expo-haptics";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../lib/theme";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [year, m] = month.split("-").map(Number);

  const { data: calendarData, isLoading: calendarsLoading } = useCalendars();
  const {
    data: eventsData,
    isLoading: eventsLoading,
    refetch,
  } = useCalendarEvents(year, m);
  const importMutation = useCalendarImport();

  const connected = calendarData?.data?.connected ?? false;
  const events = eventsData?.data ?? [];
  const newEvents = events.filter((e) => !e.alreadyImported);
  const importedEvents = events.filter((e) => e.alreadyImported);

  // Build sections data: new events first, then imported
  const sectionsData = [
    ...(newEvents.length > 0
      ? [{ type: "header" as const, title: `אירועים חדשים (${newEvents.length})` }, ...newEvents.map((e) => ({ type: "event" as const, ...e }))]
      : []),
    ...(importedEvents.length > 0
      ? [{ type: "header" as const, title: `כבר יובאו (${importedEvents.length})` }, ...importedEvents.map((e) => ({ type: "event" as const, ...e }))]
      : []),
  ];

  const handleImport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (newEvents.length === 0) {
      Alert.alert("אין אירועים חדשים", "כל האירועים כבר יובאו");
      return;
    }

    Alert.alert(
      "ייבוא אירועים",
      `לייבא ${newEvents.length} אירועים חדשים?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "ייבוא",
          onPress: async () => {
            try {
              const result = await importMutation.mutateAsync({
                year,
                month: m,
              });
              Alert.alert(
                "הצלחה",
                `יובאו ${result.data?.importedCount ?? 0} אירועים`
              );
            } catch {
              Alert.alert("שגיאה", "לא ניתן לייבא אירועים");
            }
          },
        },
      ]
    );
  };

  // -- Loading state --
  if (calendarsLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  // -- Disconnected state --
  if (!connected) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.disconnectedIcon}>
          <SymbolView
            name="calendar.badge.exclamationmark"
            tintColor={colors.textLight}
            size={48}
          />
        </View>
        <Text style={styles.disconnectedTitle}>יומן גוגל לא מחובר</Text>
        <Text style={styles.disconnectedSubtitle}>
          חבר את חשבון הגוגל שלך דרך ההגדרות באתר{"\n"}כדי לייבא אירועים כרשומות
          הכנסה
        </Text>
      </SafeAreaView>
    );
  }

  // -- Connected state --
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <MonthSelector currentMonth={month} onMonthChange={setMonth} />

      {eventsLoading ? (
        <View style={styles.skeletonList}>
          <SkeletonCalendarCard />
          <SkeletonCalendarCard />
          <SkeletonCalendarCard />
          <SkeletonCalendarCard />
        </View>
      ) : (
        <FlatList
          data={sectionsData}
          keyExtractor={(item, index) => {
            if (item.type === "header") return `header-${index}`;
            return (item as { id?: string }).id ?? `event-${index}`;
          }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text style={styles.sectionHeader}>{item.title}</Text>
              );
            }
            return (
              <CalendarEventCard
                summary={(item as { summary?: string }).summary ?? "אירוע"}
                date={String((item as { start?: string }).start ?? new Date().toISOString())}
                alreadyImported={(item as { alreadyImported: boolean }).alreadyImported}
              />
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SymbolView
                name="calendar"
                tintColor={colors.textLight}
                size={44}
              />
              <Text style={styles.emptyTitle}>אין אירועים לחודש זה</Text>
              <Text style={styles.emptySubtext}>
                אירועי היומן שלך יופיעו כאן
              </Text>
            </View>
          }
        />
      )}

      {newEvents.length > 0 ? (
        <View style={styles.importButtonContainer}>
          <TouchableOpacity
            style={[
              styles.importButton,
              importMutation.isPending && styles.importDisabled,
            ]}
            onPress={handleImport}
            disabled={importMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.importText}>
              {importMutation.isPending
                ? "מייבא..."
                : `ייבוא ${newEvents.length} אירועים`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    backgroundColor: colors.backgroundSecondary,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  skeletonList: {
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // -- Disconnected state --
  disconnectedIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  disconnectedTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  disconnectedSubtitle: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // -- Empty state --
  emptyContainer: {
    paddingTop: 80,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  // -- Import button --
  importButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
    paddingTop: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  importButton: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadows.lg,
  },
  importDisabled: {
    opacity: 0.5,
  },
  importText: {
    color: colors.white,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
});
