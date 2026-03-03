import React from "react";
import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="income"
        options={{
          title: "הכנסות",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "sheqelsign.circle", android: "payments", web: "payments" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "ניתוח",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "chart.bar", android: "bar_chart", web: "bar_chart" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "יומן",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "calendar", android: "calendar_today", web: "calendar_today" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "הגדרות",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "gearshape", android: "settings", web: "settings" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
