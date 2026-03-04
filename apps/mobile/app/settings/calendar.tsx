import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCalendars } from "../../hooks/useCalendar";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  rtlRow,
} from "../../lib/theme";

export default function CalendarSettingsScreen() {
  const { data: calendarData } = useCalendars();
  const connected = calendarData?.data?.connected ?? false;
  const calendars = calendarData?.data?.calendars ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>לוח שנה</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SymbolView name="chevron.right" tintColor={colors.text} size={18} />
          </TouchableOpacity>
        </View>

        {/* Connection status */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIcon,
                connected ? styles.statusConnected : styles.statusDisconnected,
              ]}
            >
              <SymbolView
                name={connected ? "checkmark" : "calendar"}
                tintColor={connected ? colors.success : colors.textLight}
                size={24}
              />
            </View>
          </View>

          <Text style={styles.statusTitle}>
            {connected ? "יומן Google מחובר" : "יומן לא מחובר"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {connected
              ? "היומן שלך מחובר ומוכן לייבוא אירועים"
              : "חבר את לוח השנה שלך לייבוא אוטומטי של אירועים"}
          </Text>

          {connected ? (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert("ניתוק יומן", "האם לנתק את יומן Google?", [
                  { text: "ביטול", style: "cancel" },
                  {
                    text: "נתק",
                    style: "destructive",
                    onPress: () => {
                      // Disconnect is web-only for now
                      Alert.alert("שים לב", "ניתוק היומן זמין דרך האתר בלבד");
                    },
                  },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectButtonText}>נתק יומן</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.connectHint}>
              <SymbolView name="info.circle" tintColor={colors.textMuted} size={16} />
              <Text style={styles.hintText}>
                חבר את חשבון הגוגל דרך האתר כדי לייבא אירועים
              </Text>
            </View>
          )}
        </View>

        {/* Connected calendars */}
        {connected && calendars.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>יומנים מחוברים</Text>
            <View style={styles.card}>
              {calendars.map((cal: { id: string; summary: string }, index: number) => (
                <View
                  key={cal.id}
                  style={[
                    styles.calendarRow,
                    index < calendars.length - 1 && styles.calendarRowBorder,
                  ]}
                >
                  <Text style={styles.calendarName}>{cal.summary}</Text>
                  <SymbolView name="calendar" tintColor={colors.brand} size={18} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Import settings */}
        {connected && (
          <>
            <Text style={styles.sectionTitle}>ייבוא</Text>
            <View style={styles.card}>
              <View style={styles.importRow}>
                <Text style={styles.importLabel}>סנכרון אוטומטי</Text>
                <SymbolView name="arrow.clockwise" tintColor={colors.textMuted} size={18} />
              </View>
              <Text style={styles.importHint}>
                ייבוא אוטומטי יומי של אירועים חדשים מהיומן שלך
              </Text>

              <View style={styles.importSeparator} />

              <TouchableOpacity
                style={styles.syncButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert("סנכרון", "הסנכרון הידני זמין דרך מסך ההכנסות (ייבוא מהיומן)");
                }}
                activeOpacity={0.7}
              >
                <SymbolView name="arrow.clockwise" tintColor={colors.white} size={16} />
                <Text style={styles.syncButtonText}>סנכרן עכשיו</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["5xl"],
  },

  // -- Header --
  header: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  headerSpacer: {
    flex: 1,
  },

  // -- Card --
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },

  // -- Status --
  statusRow: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statusConnected: {
    backgroundColor: colors.statusPaidBg,
  },
  statusDisconnected: {
    backgroundColor: colors.backgroundSecondary,
  },
  statusTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: "center",
  },
  statusSubtitle: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  disconnectButton: {
    alignSelf: "center",
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  disconnectButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.danger,
  },
  connectHint: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hintText: {
    flex: 1,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 20,
  },

  // -- Section --
  sectionTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // -- Calendar list --
  calendarRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  calendarRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  calendarName: {
    flex: 1,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: "right",
  },

  // -- Import --
  importRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
  },
  importLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  importHint: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  importSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  syncButton: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  syncButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
});
