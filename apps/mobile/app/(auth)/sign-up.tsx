import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../lib/theme";

export default function SignUpScreen() {
  const { signUp, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("שגיאה", "יש למלא את כל השדות");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("שגיאה", "הסיסמאות אינן תואמות");
      return;
    }
    if (password.length < 8) {
      Alert.alert("שגיאה", "הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    try {
      await signUp(name, email, password);
    } catch (error) {
      Alert.alert(
        "שגיאה",
        error instanceof Error ? error.message : "שגיאה בהרשמה"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Green gradient accent bar at top */}
      <View style={[styles.accentBar, { paddingTop: insets.top }]}>
        <View style={styles.accentBarInner} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing["2xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>ס</Text>
            </View>
          </View>
          <Text style={styles.brandName}>סדר</Text>
          <Text style={styles.subtitle}>ניהול הכנסות לפרילנסרים</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>יצירת חשבון</Text>
          <Text style={styles.formDescription}>
            הזן את הפרטים שלך כדי ליצור חשבון חדש
          </Text>

          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>שם מלא</Text>
            <TextInput
              style={[
                styles.input,
                styles.inputRtl,
                focusedField === "name" && styles.inputFocused,
              ]}
              value={name}
              onChangeText={setName}
              placeholder="ישראל ישראלי"
              placeholderTextColor={colors.textLight}
              autoComplete="name"
              textContentType="name"
              textAlign="right"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>אימייל</Text>
            <TextInput
              ref={emailRef}
              style={[
                styles.input,
                focusedField === "email" && styles.inputFocused,
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              textAlign="left"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>סיסמה</Text>
            <TextInput
              ref={passwordRef}
              style={[
                styles.input,
                focusedField === "password" && styles.inputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="לפחות 8 תווים"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              textAlign="left"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Confirm Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>אישור סיסמה</Text>
            <TextInput
              ref={confirmPasswordRef}
              style={[
                styles.input,
                focusedField === "confirmPassword" && styles.inputFocused,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="הקלד שוב את הסיסמה"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              textAlign="left"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>יצירת חשבון</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>כבר יש לך חשבון?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}> התחבר</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  accentBar: {
    backgroundColor: colors.brand,
  },
  accentBarInner: {
    height: 4,
    backgroundColor: colors.brandDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },

  // Header / Branding
  header: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.brand,
  },
  logoText: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.brand,
  },
  brandName: {
    fontSize: typography["4xl"],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing["2xl"],
    ...shadows.md,
  },
  formTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.xs,
  },
  formDescription: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    textAlign: "right",
    marginBottom: spacing["2xl"],
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 44,
  },
  inputRtl: {
    writingDirection: "rtl",
  },
  inputFocused: {
    borderColor: colors.brand,
    borderWidth: 2,
  },

  // Button
  button: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing["2xl"],
  },
  footerText: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  linkText: {
    fontSize: typography.sm,
    color: colors.brand,
    fontFamily: fonts.semibold,
  },
});
