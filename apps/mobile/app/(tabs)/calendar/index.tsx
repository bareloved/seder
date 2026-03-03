import { useState, useCallback } from "react";
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
import { MonthSelector } from "../../../components/income/MonthSelector";
import { CalendarEventCard } from "../../../components/calendar/CalendarEventCard";
import {
  useCalendars,
  useCalendarEvents,
  useCalendarImport,
} from "../../../hooks/useCalendar";

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

  const handleImport = async () => {
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

  if (calendarsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!connected) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>יומן גוגל</Text>
        <Text style={styles.subtitle}>
          חבר את חשבון הגוגל שלך דרך ההגדרות באתר כדי לייבא אירועים
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MonthSelector currentMonth={month} onMonthChange={setMonth} />

      {eventsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item, index) =>
            (item as { id?: string }).id ?? `event-${index}`
          }
          renderItem={({ item }) => (
            <CalendarEventCard
              summary={(item as { summary?: string }).summary ?? "אירוע"}
              date={(item as { start?: string }).start ?? ""}
              alreadyImported={item.alreadyImported}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                אין אירועים לחודש זה
              </Text>
            </View>
          }
        />
      )}

      {newEvents.length > 0 ? (
        <TouchableOpacity
          style={[
            styles.importButton,
            importMutation.isPending && styles.importDisabled,
          ]}
          onPress={handleImport}
          disabled={importMutation.isPending}
        >
          <Text style={styles.importText}>
            {importMutation.isPending
              ? "מייבא..."
              : `ייבוא ${newEvents.length} אירועים`}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  list: {
    paddingBottom: 80,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
  importButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  importDisabled: {
    opacity: 0.6,
  },
  importText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
