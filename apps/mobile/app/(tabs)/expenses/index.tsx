import { View, Text, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { colors, fonts, spacing, typography } from "../../../lib/theme";

export default function ExpensesScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <SymbolView
          name="doc.plaintext"
          tintColor={colors.textLight}
          size={48}
        />
        <Text style={styles.title}>הוצאות</Text>
        <Text style={styles.subtitle}>בקרוב...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textLight,
  },
});
