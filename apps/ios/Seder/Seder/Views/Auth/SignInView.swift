import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Brand header
                ZStack {
                    LinearGradient(
                        colors: [SederTheme.brandGreen, SederTheme.brandGreenDark, SederTheme.brandGreenDeep],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    // Decorative circles
                    Circle()
                        .fill(.white.opacity(0.08))
                        .frame(width: 200, height: 200)
                        .offset(x: -80, y: -40)
                    Circle()
                        .fill(.white.opacity(0.05))
                        .frame(width: 150, height: 150)
                        .offset(x: 100, y: 30)

                    VStack(spacing: 8) {
                        // Logo icon
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.white.opacity(0.2))
                            .frame(width: 64, height: 64)
                            .overlay(
                                Text("S")
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                            )

                        Text("סדר")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(.white)

                        Text("ניהול הכנסות לפרילנסרים")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
                .frame(height: 260)
                .clipShape(RoundedCornerShape(radius: 32, corners: [.bottomLeft, .bottomRight]))

                // Form
                VStack(spacing: 20) {
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
                        Text("סיסמה")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        SecureField("********", text: $password)
                            .textFieldStyle(.plain)
                            .textContentType(.password)
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
                        Task { await auth.signIn(email: email, password: password) }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .tint(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 22)
                        } else {
                            Text("התחברות")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .frame(height: 22)
                        }
                    }
                    .foregroundStyle(.white)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(email.isEmpty || password.isEmpty || auth.isLoading
                                  ? SederTheme.brandGreen.opacity(0.5)
                                  : SederTheme.brandGreen)
                    )
                    .disabled(email.isEmpty || password.isEmpty || auth.isLoading)

                    Button("אין לך חשבון? הירשם") {
                        showSignUp = true
                    }
                    .font(.subheadline)
                    .foregroundStyle(SederTheme.brandGreen)
                }
                .padding(.horizontal, 28)
                .padding(.top, 32)

                Spacer()
            }
            .ignoresSafeArea(edges: .top)
            .sheet(isPresented: $showSignUp) {
                SignUpView()
                    .environmentObject(auth)
            }
        }
    }
}

struct RoundedCornerShape: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
