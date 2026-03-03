import { View, Text, StyleSheet } from "react-native";

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

export function KPICard({ label, value, subtitle, color }: KPICardProps) {
  return (
    <View style={[styles.card, { borderStartColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderStartWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
});
