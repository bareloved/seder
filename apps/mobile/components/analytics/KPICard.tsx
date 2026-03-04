import { View, Text, StyleSheet } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../lib/theme";

type SFSymbolName = SymbolViewProps["name"];

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  icon?: SFSymbolName;
}

export function KPICard({ label, value, subtitle, color, icon }: KPICardProps) {
  return (
    <View style={styles.card}>
      {/* Label at top-right */}
      <Text style={styles.label}>{label}</Text>

      {/* Large value below */}
      <Text style={styles.value}>{value}</Text>

      {/* Subtitle */}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {/* Icon at bottom-left, subtle */}
      {icon ? (
        <View style={styles.iconContainer}>
          <SymbolView name={icon} tintColor={color} size={24} style={styles.icon} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    ...shadows.sm,
  },
  label: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "right",
  },
  value: {
    fontSize: typography["3xl"],
    fontFamily: fonts.numbersBold,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textLight,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  iconContainer: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    opacity: 0.5,
  },
  icon: {
    width: 24,
    height: 24,
  },
});
