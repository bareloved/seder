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

export default function SignInScreen() {
  const { signIn, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("שגיאה", "יש למלא את כל השדות");
      return;
    }
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert(
        "שגיאה",
        error instanceof Error ? error.message : "שגיאה בהתחברות"
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
          <Text style={styles.formTitle}>התחברות</Text>
          <Text style={styles.formDescription}>
            הזן את פרטי החשבון שלך כדי להמשיך
          </Text>

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>אימייל</Text>
            <TextInput
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
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              textAlign="left"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>התחברות</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>אין לך חשבון?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}> הירשם עכשיו</Text>
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
    marginBottom: spacing["3xl"],
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
