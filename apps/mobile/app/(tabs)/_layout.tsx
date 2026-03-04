import React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navbar } from "../../components/Navbar";
import { useDarkMode } from "../../providers/DarkModeProvider";
import { colors, darkColors, fonts } from "../../lib/theme";

export default function TabLayout() {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#1a3a2a" : colors.brand }} edges={["top"]}>
      <Navbar />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: c.brand,
          tabBarInactiveTintColor: c.textLight,
          tabBarStyle: [styles.tabBar, isDark && styles.tabBarDark],
          tabBarItemStyle: styles.tabBarItem,
          headerShown: false,
          headerShadowVisible: false,
        }}
        screenListeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      >
        <Tabs.Screen
          name="income"
          options={{
            title: "הכנסות",
            tabBarIcon: ({ color }) => (
              <SymbolView name="wallet.bifold" tintColor={color} size={26} />
            ),
            tabBarLabel: ({ focused, color }) => (
              <Text style={[styles.tabBarLabel, { color, fontFamily: focused ? fonts.medium : fonts.regular }]}>
                הכנסות
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: "לקוחות",
            tabBarIcon: ({ color }) => (
              <SymbolView name="person.2" tintColor={color} size={26} />
            ),
            tabBarLabel: ({ focused, color }) => (
              <Text style={[styles.tabBarLabel, { color, fontFamily: focused ? fonts.medium : fonts.regular }]}>
                לקוחות
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "דוחות",
            tabBarIcon: ({ color }) => (
              <SymbolView name="chart.bar" tintColor={color} size={26} />
            ),
            tabBarLabel: ({ focused, color }) => (
              <Text style={[styles.tabBarLabel, { color, fontFamily: focused ? fonts.medium : fonts.regular }]}>
                דוחות
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: "הוצאות",
            tabBarIcon: ({ color }) => (
              <SymbolView name="doc.plaintext" tintColor={color} size={26} style={{ opacity: 0.4 }} />
            ),
            tabBarLabel: () => (
              <Text style={[styles.tabBarLabel, { color: colors.textLight, opacity: 0.4, fontFamily: fonts.regular }]}>
                הוצאות
              </Text>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
            },
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 6,
  },
  tabBarDark: {
    backgroundColor: darkColors.background,
    borderTopColor: darkColors.border,
  },
  tabBarLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
});
