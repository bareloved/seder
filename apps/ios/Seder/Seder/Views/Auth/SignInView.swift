import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 60)

                    // Logo (matches web: green rounded box + "סדר" text)
                    HStack(spacing: 8) {
                        Text("סדר")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(SederTheme.textPrimary)

                        RoundedRectangle(cornerRadius: 8)
                            .fill(SederTheme.brandGreen)
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: "square.grid.2x2.fill")
                                    .font(.system(size: 18))
                                    .foregroundStyle(.white)
                            )
                    }
                    .padding(.bottom, 32)

                    // Welcome heading
                    Text("ברוכים הבאים")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .padding(.bottom, 8)

                    Text("התחברו כדי לנהל את ההכנסות שלכם")
                        .font(.subheadline)
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.bottom, 24)

                    // Error
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

                    // Form fields
                    VStack(alignment: .trailing, spacing: 16) {
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
                                .textContentType(.password)
                                .environment(\.layoutDirection, .leftToRight)
                                .padding(12)
                                .frame(height: 44)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                        }

                        // Sign in button
                        Button {
                            Task { await auth.signIn(email: email, password: password) }
                        } label: {
                            if auth.isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                            } else {
                                Text("התחברות")
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(email.isEmpty || password.isEmpty || auth.isLoading
                                      ? SederTheme.brandGreen.opacity(0.5)
                                      : SederTheme.brandGreen)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
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

                    // Google sign-in button
                    Button {
                        Task { await auth.signInWithGoogle() }
                    } label: {
                        HStack(spacing: 8) {
                            GoogleLogo()
                                .frame(width: 20, height: 20)
                            Text("התחברות עם Google")
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

                    // Toggle to sign up
                    HStack(spacing: 4) {
                        Button("הרשמה") {
                            showSignUp = true
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(SederTheme.brandGreen)

                        Text("אין לכם חשבון עדיין?")
                            .font(.subheadline)
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                    .padding(.top, 20)
                }
                .padding(.horizontal, 24)
            }
        }
        .background(Color(.systemBackground))
        .sheet(isPresented: $showSignUp) {
            SignUpView()
                .environmentObject(auth)
        }
    }
}
