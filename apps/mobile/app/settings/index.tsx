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
  danger?: boolean;
  showSeparator?: boolean;
}

function MenuRow({ label, icon, onPress, right, danger, showSeparator = true }: MenuRowProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <SymbolView
          name="chevron.left"
          tintColor={c.textLight}
          size={14}
        />
        {right ?? <View style={styles.rowSpacer} />}
        <View style={styles.rowSpacer} />
        <Text style={[styles.rowLabel, { color: danger ? c.danger : c.text }]}>
          {label}
        </Text>
        <SymbolView
          name={icon}
          tintColor={danger ? c.danger : c.textMuted}
          size={22}
        />
      </TouchableOpacity>
      {showSeparator && <View style={[styles.separator, { backgroundColor: c.border }]} />}
    </>
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
    <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundSecondary }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.title, { color: c.text }]}>הגדרות</Text>

        {/* Email banner */}
        <View style={[styles.emailBanner, { backgroundColor: c.card }]}>
          <Text style={[styles.emailText, { color: c.text }]}>{user?.email ?? "—"}</Text>
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile");
            }}
            activeOpacity={0.6}
          >
            <SymbolView name="chevron.left" tintColor={colors.textLight} size={14} />
            <View style={styles.rowSpacer} />
            <Text style={styles.rowLabel}>פרופיל</Text>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.separator} />

          <MenuRow
            label="מצב כהה"
            icon="moon.stars"
            right={
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.border, true: colors.brand }}
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
            right={
              connected ? (
                <Text style={styles.statusText}>מחובר</Text>
              ) : undefined
            }
          />

          <MenuRow
            label="חשבון"
            icon="shield"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/account");
            }}
          />

          <MenuRow
            label="התנתקות"
            icon="rectangle.portrait.and.arrow.right"
            onPress={handleSignOut}
            danger
            showSeparator={false}
          />
        </View>

        {/* Version */}
        <Text style={styles.versionText}>סדר v1.0.0</Text>
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
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["5xl"],
  },

  // -- Title --
  title: {
    fontSize: typography["3xl"],
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.lg,
  },

  // -- Email banner --
  emailBanner: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  emailText: {
    fontSize: typography.base,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    textAlign: "right",
  },

  // -- Menu --
  menuList: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  rowSpacer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  statusText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  toggle: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // -- Avatar --
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.brand,
  },

  // -- Version --
  versionText: {
    fontSize: typography.xs,
    fontFamily: fonts.numbersRegular,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing["3xl"],
  },
});
