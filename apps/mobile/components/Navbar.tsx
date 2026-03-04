import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../providers/DarkModeProvider";
import { colors, darkColors, fonts, spacing, borderRadius, rtlRow } from "../lib/theme";

export function Navbar() {
  const { user } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const c = isDark ? darkColors : colors;

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "";

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Right side: Logo icon */}
      <View style={styles.logoContainer}>
        <SymbolView name="doc.on.clipboard" tintColor={colors.white} size={22} />
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Left side: Calendar + Profile */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleDarkMode();
          }}
          activeOpacity={0.7}
        >
          <SymbolView
            name={isDark ? "sun.max" : "moon.stars"}
            tintColor={colors.white}
            size={20}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push("/settings")}
          activeOpacity={0.7}
        >
          {user?.image ? (
            <Image source={{ uri: user.image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              {initial ? (
                <Text style={styles.avatarInitial}>{initial}</Text>
              ) : (
                <SymbolView name="person" tintColor="rgba(255,255,255,0.9)" size={16} />
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: colors.brand,
    flexDirection: rtlRow,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  containerDark: {
    backgroundColor: "#1a3a2a",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#30363d",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  spacer: {
    flex: 1,
  },
  actions: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
});
