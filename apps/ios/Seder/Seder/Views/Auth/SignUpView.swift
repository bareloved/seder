import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var showEmailForm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 40)

                    Text("יצירת חשבון")
                        .font(SederTheme.ploni(24, weight: .bold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .padding(.bottom, 8)

                    Text("צרו חשבון כדי להתחיל לעקוב אחרי ההכנסות")
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.bottom, 24)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(SederTheme.ploni(15))
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

                    // Google sign-up button (primary CTA)
                    Button {
                        Task {
                            await auth.signInWithGoogle()
                            if auth.isAuthenticated { dismiss() }
                        }
                    } label: {
                        HStack(spacing: 10) {
                            GoogleLogo()
                                .frame(width: 24, height: 24)
                            Text("המשיכו עם Google")
                                .font(SederTheme.ploni(18, weight: .medium))
                                .foregroundStyle(SederTheme.textPrimary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                    }
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color(.systemBackground))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color(.systemGray4).opacity(0.6), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .disabled(auth.isLoading)

                    Text("מומלץ - מאפשר ייבוא אירועים מ-Google Calendar")
                        .font(SederTheme.ploni(12))
                        .foregroundStyle(SederTheme.textTertiary)
                        .padding(.top, 10)

                    // Collapsible divider
                    HStack(spacing: 0) {
                        Rectangle()
                            .fill(SederTheme.cardBorder)
                            .frame(height: 1)

                        Button {
                            withAnimation(.easeOut(duration: 0.2)) {
                                showEmailForm.toggle()
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text("או הרשמה עם אימייל")
                                    .font(SederTheme.ploni(14))
                                    .foregroundStyle(SederTheme.textTertiary)
                                    .fixedSize()
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 10))
                                    .foregroundStyle(SederTheme.textTertiary)
                                    .rotationEffect(.degrees(showEmailForm ? 180 : 0))
                            }
                            .padding(.horizontal, 8)
                        }

                        Rectangle()
                            .fill(SederTheme.cardBorder)
                            .frame(height: 1)
                    }
                    .padding(.vertical, 24)

                    // Email form (collapsible)
                    if showEmailForm {
                        VStack(alignment: .trailing, spacing: 16) {
                            // Name
                            VStack(alignment: .trailing, spacing: 6) {
                                Text("שם מלא")
                                    .font(SederTheme.ploni(15, weight: .medium))
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
                                    .font(SederTheme.ploni(15, weight: .medium))
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
                                    .font(SederTheme.ploni(15, weight: .medium))
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
                                        .font(SederTheme.ploni(16, weight: .medium))
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
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    // Toggle to sign in
                    HStack(spacing: 4) {
                        Button("התחברות") { dismiss() }
                            .font(SederTheme.ploni(15, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                        Text("כבר יש לכם חשבון?")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                    .padding(.top, 24)

                    // Legal text
                    Text("בהמשך, אתם מסכימים לתנאי השימוש ומדיניות הפרטיות")
                        .font(SederTheme.ploni(12))
                        .foregroundStyle(SederTheme.textTertiary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 32)
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
                .font(SederTheme.ploni(12))
                .foregroundStyle(passed ? SederTheme.paidColor : SederTheme.textTertiary)
            Image(systemName: passed ? "checkmark.circle.fill" : "circle")
                .font(SederTheme.ploni(12))
                .foregroundStyle(passed ? SederTheme.paidColor : SederTheme.textTertiary)
        }
    }
}
