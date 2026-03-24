import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 40)

                    Text("יצירת חשבון")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .padding(.bottom, 8)

                    Text("הרשמו כדי להתחיל לנהל את ההכנסות")
                        .font(.subheadline)
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.bottom, 24)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(.red)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.05))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.red.opacity(0.2), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .padding(.bottom, 16)
                    }

                    VStack(alignment: .trailing, spacing: 16) {
                        // Name
                        VStack(alignment: .trailing, spacing: 6) {
                            Text("שם מלא")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(SederTheme.textSecondary)
                            TextField("השם שלכם", text: $name)
                                .textFieldStyle(.plain)
                                .textContentType(.name)
                                .padding(12)
                                .frame(height: 44)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                        }

                        // Email
                        VStack(alignment: .trailing, spacing: 6) {
                            Text("אימייל")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(SederTheme.textSecondary)
                            TextField("your@email.com", text: $email)
                                .textFieldStyle(.plain)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .environment(\.layoutDirection, .leftToRight)
                                .padding(12)
                                .frame(height: 44)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                        }

                        // Password
                        VStack(alignment: .trailing, spacing: 6) {
                            Text("סיסמה")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(SederTheme.textSecondary)
                            SecureField("••••••••", text: $password)
                                .textFieldStyle(.plain)
                                .textContentType(.newPassword)
                                .environment(\.layoutDirection, .leftToRight)
                                .padding(12)
                                .frame(height: 44)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )

                            if !password.isEmpty {
                                PasswordCheck(label: "לפחות 8 תווים", passed: password.count >= 8)
                                    .padding(.top, 4)
                            }
                        }

                        // Sign up button
                        Button {
                            Task {
                                await auth.signUp(name: name, email: email, password: password)
                                if auth.isAuthenticated { dismiss() }
                            }
                        } label: {
                            if auth.isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                            } else {
                                Text("יצירת חשבון")
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading
                                      ? SederTheme.brandGreen.opacity(0.5)
                                      : SederTheme.brandGreen)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .disabled(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading)
                    }

                    // Divider
                    HStack(spacing: 12) {
                        Rectangle()
                            .fill(SederTheme.cardBorder)
                            .frame(height: 1)
                        Text("או")
                            .font(.subheadline)
                            .foregroundStyle(SederTheme.textTertiary)
                        Rectangle()
                            .fill(SederTheme.cardBorder)
                            .frame(height: 1)
                    }
                    .padding(.vertical, 20)

                    // Google sign-up button
                    Button {
                        Task {
                            await auth.signInWithGoogle()
                            if auth.isAuthenticated { dismiss() }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            GoogleLogo()
                                .frame(width: 20, height: 20)
                            Text("הרשמה עם Google")
                                .font(.body.weight(.medium))
                                .foregroundStyle(SederTheme.textPrimary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                    }
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(.systemBackground))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .disabled(auth.isLoading)

                    HStack(spacing: 4) {
                        Button("התחברות") { dismiss() }
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(SederTheme.brandGreen)
                        Text("כבר יש לכם חשבון?")
                            .font(.subheadline)
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                    .padding(.top, 20)
                }
                .padding(.horizontal, 24)
            }
            .background(Color(.systemBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

struct PasswordCheck: View {
    let label: String
    let passed: Bool

    var body: some View {
        HStack(spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundStyle(passed ? SederTheme.paidColor : SederTheme.textTertiary)
            Image(systemName: passed ? "checkmark.circle.fill" : "circle")
                .font(.caption)
                .foregroundStyle(passed ? SederTheme.paidColor : SederTheme.textTertiary)
        }
    }
}
