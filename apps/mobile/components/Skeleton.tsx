import { useEffect } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, borderRadius } from "../lib/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadiusSize?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadiusSize = borderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius: borderRadiusSize },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonKPICard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.kpiCard, style]}>
      <Skeleton width="60%" height={12} />
      <Skeleton width="80%" height={28} style={{ marginTop: 8 }} />
      <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonIncomeCard() {
  return (
    <View style={styles.incomeCard}>
      <View style={styles.incomeCardDateBox}>
        <Skeleton width={28} height={20} />
        <Skeleton width={32} height={10} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.incomeCardContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
        <Skeleton width="30%" height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonCalendarCard() {
  return (
    <View style={styles.calendarCard}>
      <View style={styles.incomeCardDateBox}>
        <Skeleton width={28} height={20} />
        <Skeleton width={32} height={10} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.incomeCardContent}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="30%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 100,
  },
  incomeCard: {
    flexDirection: "row-reverse",
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 12,
  },
  incomeCardDateBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 42,
  },
  incomeCardContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  calendarCard: {
    flexDirection: "row-reverse",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
});
