import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../hooks/useAuth";
import { getAuthToken } from "../../lib/auth-storage";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  rtlRow,
} from "../../lib/theme";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Change Password Modal
// ---------------------------------------------------------------------------

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("שגיאה", "יש למלא את כל השדות");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("שגיאה", "הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("שגיאה", "הסיסמאות לא תואמות");
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "שגיאה בשינוי הסיסמה");
      }

      Alert.alert("הצלחה", "הסיסמה שונתה בהצלחה");
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert("שגיאה", err?.message || "לא ניתן לשנות סיסמה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.modalCard}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <SymbolView name="xmark" tintColor={colors.textMuted} size={16} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={styles.modalTitle}>שינוי סיסמה</Text>
          </View>

          {/* Fields */}
          <Text style={styles.inputLabel}>סיסמה נוכחית</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="הזן סיסמה נוכחית"
            placeholderTextColor={colors.textLight}
            textAlign="right"
          />

          <Text style={styles.inputLabel}>סיסמה חדשה</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="לפחות 8 תווים"
            placeholderTextColor={colors.textLight}
            textAlign="right"
          />

          <Text style={styles.inputLabel}>אימות סיסמה</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="הזן שוב את הסיסמה החדשה"
            placeholderTextColor={colors.textLight}
            textAlign="right"
          />

          {/* Save */}
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.modalSaveButtonText}>שנה סיסמה</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Account screen
// ---------------------------------------------------------------------------

export default function AccountScreen() {
  const { signOut, user } = useAuth();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert("התנתקות", "האם להתנתק?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", style: "destructive", onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "מחיקת חשבון",
      "פעולה זו תמחק את כל הנתונים שלך לצמיתות. האם להמשיך?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק חשבון",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "אישור סופי",
              "האם אתה בטוח? לא ניתן לשחזר את הנתונים לאחר מחיקה.",
              [
                { text: "ביטול", style: "cancel" },
                {
                  text: "מחק לצמיתות",
                  style: "destructive",
                  onPress: () => {
                    // Account deletion would go through server action
                    Alert.alert("שים לב", "מחיקת חשבון זמינה דרך האתר בלבד כרגע");
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>חשבון</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Email */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>כתובת אימייל</Text>
              <Text style={styles.cardValueLtr}>{user?.email ?? "—"}</Text>
            </View>
            <SymbolView name="envelope" tintColor={colors.textMuted} size={20} />
          </View>
        </View>

        {/* Password */}
        <View style={[styles.card, { marginTop: spacing.md }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>סיסמה</Text>
              <Text style={styles.cardValueDots}>••••••••</Text>
            </View>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPasswordModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>שינוי סיסמה</Text>
            </TouchableOpacity>
            <SymbolView name="lock" tintColor={colors.textMuted} size={20} />
          </View>
        </View>

        {/* Active sessions */}
        <Text style={styles.sectionTitle}>מכשירים פעילים</Text>
        <View style={styles.card}>
          <Text style={styles.hintText}>
            המכשירים המחוברים לחשבון שלך כרגע.
          </Text>
          <View style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>מכשיר נוכחי</Text>
              <Text style={styles.sessionMeta}>iOS • פעיל עכשיו</Text>
            </View>
            <SymbolView name="iphone" tintColor={colors.brand} size={20} />
          </View>
        </View>

        {/* Management */}
        <Text style={styles.sectionTitle}>ניהול</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/categories");
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.menuText}>קטגוריות</Text>
            <View style={styles.menuSpacer} />
            <SymbolView name="folder" tintColor={colors.textMuted} size={20} />
          </TouchableOpacity>
          <View style={styles.menuBorder} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/clients");
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.menuText}>לקוחות</Text>
            <View style={styles.menuSpacer} />
            <SymbolView name="person.2" tintColor={colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={styles.dangerTitle}>אזור מסוכן</Text>
        <View style={styles.dangerCard}>
          <View style={styles.dangerRow}>
            <Text style={styles.dangerLabel}>מחיקת חשבון</Text>
            <SymbolView name="exclamationmark.triangle" tintColor={colors.danger} size={20} />
          </View>
          <Text style={styles.dangerHint}>
            פעולה זו תמחק את כל הנתונים שלך לצמיתות, כולל הכנסות, קטגוריות ולקוחות. לא ניתן לשחזר לאחר מחיקה.
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>מחק חשבון</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
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
  cardRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.md,
  },
  cardInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  cardLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "right",
  },
  cardValueLtr: {
    fontSize: typography.base,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    marginTop: spacing.xs,
  },
  cardValueDots: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    marginTop: spacing.xs,
    letterSpacing: 2,
  },
  cardGroup: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  // -- Outline button --
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  outlineButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.text,
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

  // -- Hint --
  hintText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 20,
  },

  // -- Sessions --
  sessionRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sessionInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  sessionDevice: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  sessionMeta: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  // -- Menu items --
  menuItem: {
    flexDirection: rtlRow,
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    minHeight: 52,
  },
  menuBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  menuSpacer: {
    flex: 1,
  },
  menuText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
  },

  // -- Danger zone --
  dangerTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.danger,
    textAlign: "right",
    marginTop: spacing["3xl"],
    marginBottom: spacing.md,
  },
  dangerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.xl,
  },
  dangerRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
  },
  dangerLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.danger,
  },
  dangerHint: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 20,
    marginTop: spacing.md,
  },
  deleteButton: {
    alignSelf: "flex-start",
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  deleteButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.danger,
  },

  // -- Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: "85%",
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: rtlRow,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },

  // -- Inputs --
  inputLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.backgroundTertiary,
    minHeight: 48,
  },
  modalSaveButton: {
    backgroundColor: "#1e293b",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.xl,
  },
  modalSaveButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
});
