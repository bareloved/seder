import { Children } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../hooks/useAuth";
import { useCalendars } from "../../hooks/useCalendar";
import { useDarkMode } from "../../providers/DarkModeProvider";
import {
  colors,
  darkColors,
  fonts,
  spacing,
  borderRadius,
  typography,
  rtlRow,
} from "../../lib/theme";

type SFSymbolName = SymbolViewProps["name"];

// ---------------------------------------------------------------------------
// Menu row
// ---------------------------------------------------------------------------

interface MenuRowProps {
  label: string;
  icon: SFSymbolName;
  onPress?: () => void;
  right?: React.ReactNode;
  value?: string;
  danger?: boolean;
}

function MenuRow({ label, icon, onPress, right, value, danger }: MenuRowProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const showChevron = !!onPress && !right;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <SymbolView
        name={icon}
        tintColor={danger ? c.danger : c.textMuted}
        size={22}
      />
      <Text style={[styles.rowLabel, { color: danger ? c.danger : c.text }]}>
        {label}
      </Text>
      <View style={styles.rowSpacer} />
      {value && !right && (
        <Text style={[styles.valueText, { color: c.textMuted }]}>{value}</Text>
      )}
      {right}
      {showChevron && (
        <SymbolView
          name="chevron.left"
          tintColor={c.textLight}
          size={14}
        />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Menu section
// ---------------------------------------------------------------------------

interface MenuSectionProps {
  title?: string;
  children: React.ReactNode;
}

function MenuSection({ title, children }: MenuSectionProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const items = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
          {title}
        </Text>
      )}
      <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && (
              <View
                style={[
                  styles.rowSeparator,
                  { backgroundColor: c.border },
                ]}
              />
            )}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { data: calendarData } = useCalendars();
  const { isDark, toggleDarkMode } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const connected = calendarData?.data?.connected ?? false;

  const handleSignOut = () => {
    Alert.alert("התנתקות", "האם להתנתק?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: c.backgroundSecondary }]}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <SymbolView name="xmark" tintColor={c.textSecondary} size={14} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: c.text }]}>הגדרות</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Email */}
        <Text style={[styles.emailText, { color: c.textMuted }]}>
          {user?.email ?? "—"}
        </Text>

        {/* Section 1 — Account */}
        <MenuSection title="חשבון">
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile");
            }}
            activeOpacity={0.6}
          >
            <SymbolView
              name="person.circle"
              tintColor={c.textMuted}
              size={22}
            />
            <Text style={[styles.rowLabel, { color: c.text }]}>פרופיל</Text>
            <View style={styles.rowSpacer} />
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: c.brandLight }]}>
                <Text style={[styles.avatarInitial, { color: c.brand }]}>
                  {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <SymbolView name="chevron.left" tintColor={c.textLight} size={14} />
          </TouchableOpacity>

          <MenuRow
            label="חשבון"
            icon="shield"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/account");
            }}
          />
        </MenuSection>

        {/* Section 2 — Preferences */}
        <MenuSection title="העדפות">
          <MenuRow
            label="מראה"
            icon="moon.stars"
            value={isDark ? "כהה" : "בהיר"}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ false: c.border, true: c.brand }}
                thumbColor={colors.white}
                style={styles.toggle}
              />
            }
          />

          <MenuRow
            label="לוח שנה"
            icon="calendar"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/calendar");
            }}
            value={connected ? "מחובר" : undefined}
          />
        </MenuSection>

        {/* Section 3 — Sign Out */}
        <MenuSection>
          <MenuRow
            label="התנתקות"
            icon="rectangle.portrait.and.arrow.right"
            onPress={handleSignOut}
            danger
          />
        </MenuSection>

        {/* Version */}
        <Text style={[styles.versionText, { color: c.textLight }]}>
          סדר v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  // -- Header --
  header: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerSide: {
    width: 36,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // -- Email --
  emailText: {
    fontSize: typography.sm,
    fontFamily: fonts.numbersRegular,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: -spacing.md,
  },

  // -- Sections --
  section: {
    marginTop: spacing["2xl"],
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    textAlign: "right",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginRight: spacing["5xl"],
  },

  // -- Menu row --
  row: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowSpacer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
  },
  valueText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
  },
  toggle: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // -- Avatar --
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },

  // -- Version --
  versionText: {
    fontSize: typography.xs,
    fontFamily: fonts.numbersRegular,
    textAlign: "center",
    marginTop: spacing["3xl"],
  },
});
