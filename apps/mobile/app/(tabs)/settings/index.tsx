import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { useCalendars } from "../../../hooks/useCalendar";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { data: calendarData } = useCalendars();
  const connected = calendarData?.data?.connected ?? false;

  const handleSignOut = () => {
    Alert.alert("התנתקות", "האם להתנתק?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "התנתק",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ניהול</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/categories/")}
        >
          <Text style={styles.menuArrow}>‹</Text>
          <Text style={styles.menuText}>קטגוריות</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/clients/")}
        >
          <Text style={styles.menuArrow}>‹</Text>
          <Text style={styles.menuText}>לקוחות</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>יומן גוגל</Text>
        <View style={styles.menuItem}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? "#10b981" : "#ef4444" },
            ]}
          />
          <Text style={styles.menuText}>
            {connected ? "מחובר" : "לא מחובר"}
          </Text>
        </View>
        {!connected ? (
          <Text style={styles.hint}>
            חבר את חשבון הגוגל דרך האתר כדי לייבא אירועים
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>חשבון</Text>
        <TouchableOpacity
          style={[styles.menuItem, styles.dangerItem]}
          onPress={handleSignOut}
        >
          <Text style={styles.dangerText}>התנתקות</Text>
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    textAlign: "right",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  menuText: {
    fontSize: 16,
    color: "#111827",
  },
  menuArrow: {
    fontSize: 18,
    color: "#9ca3af",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "600",
  },
});
