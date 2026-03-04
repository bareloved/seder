import { Stack } from "expo-router";
import { colors, typography } from "../../../lib/theme";

export default function IncomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerTitle: "פרטי הכנסה",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: typography.lg,
            fontWeight: typography.semibold,
            color: colors.text,
          },
          headerBackTitle: "חזרה",
          headerTintColor: colors.brand,
          presentation: "card",
        }}
      />
    </Stack>
  );
}
