import { View, Text, StyleSheet } from "react-native";

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
  const dateStr = new Date(date).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

  return (
    <View
      style={[styles.card, alreadyImported && styles.importedCard]}
    >
      <View style={styles.content}>
        <Text
          style={[styles.summary, alreadyImported && styles.importedText]}
          numberOfLines={1}
        >
          {summary}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{dateStr}</Text>
          {startTime ? (
            <Text style={styles.time}>
              {startTime}
              {endTime ? ` - ${endTime}` : ""}
            </Text>
          ) : null}
        </View>
      </View>
      {alreadyImported ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>יובא</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  importedCard: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    alignItems: "flex-end",
  },
  summary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  importedText: {
    color: "#6b7280",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  date: {
    fontSize: 13,
    color: "#6b7280",
  },
  time: {
    fontSize: 13,
    color: "#9ca3af",
  },
  badge: {
    backgroundColor: "#d1fae5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginStart: 10,
  },
  badgeText: {
    fontSize: 12,
    color: "#065f46",
    fontWeight: "600",
  },
});
