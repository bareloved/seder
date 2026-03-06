import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Brand header (compact)
                ZStack {
                    LinearGradient(
                        colors: [SederTheme.brandGreen, SederTheme.brandGreenDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    Circle()
                        .fill(.white.opacity(0.06))
                        .frame(width: 120, height: 120)
                        .offset(x: -60, y: -20)

                    Text("הרשמה")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                }
                .frame(height: 140)
                .clipShape(RoundedCornerShape(radius: 28, corners: [.bottomLeft, .bottomRight]))

                // Form
                VStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("שם מלא")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        TextField("ישראל ישראלי", text: $name)
                            .textFieldStyle(.plain)
                            .textContentType(.name)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("אימייל")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        TextField("your@email.com", text: $email)
                            .textFieldStyle(.plain)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .environment(\.layoutDirection, .leftToRight)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("סיסמה (8 תווים לפחות)")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        SecureField("********", text: $password)
                            .textFieldStyle(.plain)
                            .textContentType(.newPassword)
                            .environment(\.layoutDirection, .leftToRight)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }

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
                                .frame(height: 22)
                        } else {
                            Text("הרשמה")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .frame(height: 22)
                        }
                    }
                    .foregroundStyle(.white)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading
                                  ? SederTheme.brandGreen.opacity(0.5)
                                  : SederTheme.brandGreen)
                    )
                    .disabled(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading)
                }
                .padding(.horizontal, 28)
                .padding(.top, 28)

                Spacer()
            }
            .ignoresSafeArea(edges: .top)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
