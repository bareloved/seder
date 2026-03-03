import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface MonthSelectorProps {
  currentMonth: string; // "2026-03" format
  onMonthChange: (month: string) => void;
}

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function parseMonth(month: string): { year: number; m: number } {
  const [year, m] = month.split("-").map(Number);
  return { year, m };
}

function formatMonth(year: number, m: number): string {
  return `${year}-${String(m).padStart(2, "0")}`;
}

export function MonthSelector({
  currentMonth,
  onMonthChange,
}: MonthSelectorProps) {
  const { year, m } = parseMonth(currentMonth);

  const goToPrevMonth = () => {
    if (m === 1) {
      onMonthChange(formatMonth(year - 1, 12));
    } else {
      onMonthChange(formatMonth(year, m - 1));
    }
  };

  const goToNextMonth = () => {
    if (m === 12) {
      onMonthChange(formatMonth(year + 1, 1));
    } else {
      onMonthChange(formatMonth(year, m + 1));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goToNextMonth} style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </TouchableOpacity>

      <Text style={styles.monthText}>
        {HEBREW_MONTHS[m - 1]} {year}
      </Text>

      <TouchableOpacity onPress={goToPrevMonth} style={styles.arrow}>
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  arrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 24,
    color: "#2563eb",
    fontWeight: "600",
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 16,
    minWidth: 130,
    textAlign: "center",
  },
});
