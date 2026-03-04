import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../hooks/useAuth";
import { useSettings, useSettingsMutation } from "../../hooks/useSettings";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  rtlRow,
} from "../../lib/theme";

const LANGUAGES = [
  { value: "he", label: "עברית" },
  { value: "en", label: "English (coming soon)", disabled: true },
];

const TIMEZONES = [
  { value: "Asia/Jerusalem", label: "Asia/Jerusalem (GMT+2)" },
  { value: "Europe/London", label: "Europe/London (GMT+0)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
];

const CURRENCIES = [
  { value: "ILS", label: "₪ שקל חדש (ILS)" },
  { value: "USD", label: "$ דולר (USD)" },
  { value: "EUR", label: "€ אירו (EUR)" },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const { data: settingsData } = useSettings();
  const settingsMutation = useSettingsMutation();
  const settings = settingsData?.data;

  const [language, setLanguage] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);

  const activeLanguage = language ?? settings?.language ?? "he";
  const activeTimezone = timezone ?? settings?.timezone ?? "Asia/Jerusalem";
  const activeCurrency = currency ?? settings?.defaultCurrency ?? "ILS";

  const [expandedPicker, setExpandedPicker] = useState<
    "language" | "timezone" | "currency" | null
  >(null);

  const hasChanges =
    (language !== null && language !== (settings?.language ?? "he")) ||
    (timezone !== null && timezone !== (settings?.timezone ?? "Asia/Jerusalem")) ||
    (currency !== null && currency !== (settings?.defaultCurrency ?? "ILS"));

  const handleSave = async () => {
    try {
      await settingsMutation.mutateAsync({
        language: activeLanguage,
        timezone: activeTimezone,
        defaultCurrency: activeCurrency,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("נשמר", "ההעדפות עודכנו בהצלחה");
    } catch {
      Alert.alert("שגיאה", "לא ניתן לשמור העדפות");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SymbolView name="chevron.right" tintColor={colors.text} size={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>פרופיל</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Email card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>כתובת אימייל</Text>
          <Text style={styles.emailValue}>{user?.email ?? "—"}</Text>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>העדפות</Text>

        <View style={styles.card}>
          {/* Language */}
          <Text style={styles.fieldLabel}>שפה</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedPicker(expandedPicker === "language" ? null : "language");
            }}
            activeOpacity={0.7}
          >
            <SymbolView name="chevron.down" tintColor={colors.textLight} size={14} />
            <View style={styles.pickerSpacer} />
            <Text style={styles.pickerText}>
              {LANGUAGES.find((l) => l.value === activeLanguage)?.label ?? activeLanguage}
            </Text>
          </TouchableOpacity>
          {expandedPicker === "language" && (
            <View style={styles.optionList}>
              {LANGUAGES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionRow,
                    opt.value === activeLanguage && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    if (opt.disabled) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage(opt.value);
                    setExpandedPicker(null);
                  }}
                  activeOpacity={opt.disabled ? 1 : 0.6}
                >
                  {opt.value === activeLanguage && (
                    <SymbolView name="checkmark" tintColor={colors.brand} size={14} />
                  )}
                  <View style={styles.pickerSpacer} />
                  <Text
                    style={[
                      styles.optionText,
                      opt.disabled && styles.optionTextDisabled,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Separator */}
          <View style={styles.fieldSeparator} />

          {/* Timezone */}
          <Text style={styles.fieldLabel}>אזור זמן</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedPicker(expandedPicker === "timezone" ? null : "timezone");
            }}
            activeOpacity={0.7}
          >
            <SymbolView name="chevron.down" tintColor={colors.textLight} size={14} />
            <View style={styles.pickerSpacer} />
            <Text style={styles.pickerTextLtr}>
              {TIMEZONES.find((t) => t.value === activeTimezone)?.label ?? activeTimezone}
            </Text>
          </TouchableOpacity>
          {expandedPicker === "timezone" && (
            <View style={styles.optionList}>
              {TIMEZONES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionRow,
                    opt.value === activeTimezone && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTimezone(opt.value);
                    setExpandedPicker(null);
                  }}
                  activeOpacity={0.6}
                >
                  {opt.value === activeTimezone && (
                    <SymbolView name="checkmark" tintColor={colors.brand} size={14} />
                  )}
                  <View style={styles.pickerSpacer} />
                  <Text style={styles.optionTextLtr}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Separator */}
          <View style={styles.fieldSeparator} />

          {/* Currency */}
          <Text style={styles.fieldLabel}>מטבע ברירת מחדל</Text>
          <Text style={styles.fieldHint}>
            המטבע שיוצג בברירת מחדל בהוספת עבודה חדשה
          </Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedPicker(expandedPicker === "currency" ? null : "currency");
            }}
            activeOpacity={0.7}
          >
            <SymbolView name="chevron.down" tintColor={colors.textLight} size={14} />
            <View style={styles.pickerSpacer} />
            <Text style={styles.pickerText}>
              {CURRENCIES.find((c) => c.value === activeCurrency)?.label ?? activeCurrency}
            </Text>
          </TouchableOpacity>
          {expandedPicker === "currency" && (
            <View style={styles.optionList}>
              {CURRENCIES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionRow,
                    opt.value === activeCurrency && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrency(opt.value);
                    setExpandedPicker(null);
                  }}
                  activeOpacity={0.6}
                >
                  {opt.value === activeCurrency && (
                    <SymbolView name="checkmark" tintColor={colors.brand} size={14} />
                  )}
                  <View style={styles.pickerSpacer} />
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Save button */}
        {hasChanges && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={settingsMutation.isPending}
            activeOpacity={0.8}
          >
            {settingsMutation.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>שמור שינויים</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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

  // -- Header --
  header: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  headerSpacer: {
    flex: 1,
  },

  // -- Cards --
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  cardLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "right",
  },
  emailValue: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.sm,
  },

  // -- Section --
  sectionTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // -- Fields --
  fieldLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  fieldSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },

  // -- Picker --
  picker: {
    flexDirection: rtlRow,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    backgroundColor: colors.backgroundTertiary,
  },
  pickerSpacer: {
    flex: 1,
  },
  pickerText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  pickerTextLtr: {
    fontSize: typography.base,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
  },

  // -- Options list --
  optionList: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  optionRowActive: {
    backgroundColor: colors.brandLight,
  },
  optionText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  optionTextLtr: {
    fontSize: typography.base,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
  },
  optionTextDisabled: {
    color: colors.textLight,
  },

  // -- Save --
  saveButton: {
    backgroundColor: "#1e293b",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    minHeight: 48,
    marginTop: spacing.xl,
  },
  saveButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
});
