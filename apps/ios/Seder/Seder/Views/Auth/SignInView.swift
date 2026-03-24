import SwiftUI

/// Three stacked rounded bars — matches the Seder app icon SVG exactly
struct SederLogo: View {
    // Icon gradient colors from SVG (lightest top → darkest bottom)
    private let topGreen = Color(red: 0.37, green: 0.91, blue: 0.63)    // #5ee8a0
    private let midGreen = Color(red: 0.24, green: 0.86, blue: 0.53)    // #3ddb88
    private let botGreen = Color(red: 0.18, green: 0.80, blue: 0.44)    // #2ecc71

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let barH = h * 0.22
            let gap = h * 0.08
            let radius = barH / 2

            VStack(spacing: gap) {
                // Top bar (narrowest) — #5ee8a0
                RoundedRectangle(cornerRadius: radius)
                    .fill(topGreen)
                    .frame(width: w * 0.55, height: barH)
                // Middle bar — #3ddb88
                RoundedRectangle(cornerRadius: radius)
                    .fill(midGreen)
                    .frame(width: w * 0.75, height: barH)
                    .opacity(0.92)
                // Bottom bar (widest) — #2ecc71
                RoundedRectangle(cornerRadius: radius)
                    .fill(botGreen)
                    .frame(width: w, height: barH)
                    .opacity(0.85)
            }
            .frame(width: w, height: h)
            .rotationEffect(.degrees(8))
        }
    }
}

struct SignInView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false
    @State private var showEmailForm = false
    @State private var showPassword = false

    // Background — matches icon-forest.svg: #1b4332 → #0f2b1f
    private let bgTop = Color(red: 0.106, green: 0.263, blue: 0.196)     // #1b4332
    private let bgBottom = Color(red: 0.059, green: 0.169, blue: 0.122)  // #0f2b1f
    // Geometric band shades (subtle lighter/darker than bg)
    private let bandLight = Color(red: 0.14, green: 0.33, blue: 0.24)
    private let bandPale = Color(red: 0.17, green: 0.38, blue: 0.28)
    private let bandDark = Color(red: 0.08, green: 0.20, blue: 0.15)
    // Accent
    private let accentGreen = Color(red: 0.18, green: 0.80, blue: 0.44) // #2ecc71

    var body: some View {
        ZStack {
            // Gradient background matching icon
            LinearGradient(
                colors: [bgTop, bgBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Subtle green glow (matches SVG radialGradient "glow")
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            accentGreen.opacity(0.12),
                            accentGreen.opacity(0.03),
                            .clear
                        ],
                        center: .center,
                        startRadius: 20,
                        endRadius: 220
                    )
                )
                .frame(width: 440, height: 440)
                .offset(x: 0, y: -60)
                .ignoresSafeArea()

            // Diagonal geometric bands
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height

                Path { p in
                    p.move(to: CGPoint(x: w * 0.3, y: 0))
                    p.addLine(to: CGPoint(x: w, y: 0))
                    p.addLine(to: CGPoint(x: w, y: h * 0.45))
                    p.addLine(to: CGPoint(x: w * 0.05, y: h * 0.15))
                    p.closeSubpath()
                }
                .fill(bandLight.opacity(0.4))

                Path { p in
                    p.move(to: CGPoint(x: w * 0.55, y: 0))
                    p.addLine(to: CGPoint(x: w, y: 0))
                    p.addLine(to: CGPoint(x: w, y: h * 0.3))
                    p.addLine(to: CGPoint(x: w * 0.3, y: h * 0.08))
                    p.closeSubpath()
                }
                .fill(bandPale.opacity(0.3))

                Ellipse()
                    .fill(bandDark.opacity(0.3))
                    .frame(width: w * 0.7, height: h * 0.25)
                    .rotationEffect(.degrees(-15))
                    .offset(x: -w * 0.25, y: h * 0.35)
            }
            .ignoresSafeArea()

            // Content
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer().frame(height: 90)

                    // Logo + brand name
                    SederLogo()
                        .frame(width: 60, height: 50)
                        .padding(.bottom, 16)

                    Text("סדר")
                        .font(SederTheme.ploni(36, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.bottom, 50)

                    // MARK: - Form
                    VStack(spacing: 16) {
                        // Error
                        if let error = auth.errorMessage {
                            Text(error)
                                .font(SederTheme.ploni(14))
                                .foregroundStyle(.white)
                                .padding(12)
                                .frame(maxWidth: .infinity)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.red.opacity(0.6))
                                )
                                .padding(.bottom, 4)
                        }

                        // Google sign-in
                        Button {
                            Task { await auth.signInWithGoogle() }
                        } label: {
                            HStack(spacing: 10) {
                                GoogleLogo()
                                    .frame(width: 20, height: 20)
                                Text("המשיכו עם Google")
                                    .font(SederTheme.ploni(16, weight: .medium))
                                    .foregroundStyle(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.1))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                    )
                            )
                        }
                        .disabled(auth.isLoading)

                        // Divider
                        HStack(spacing: 12) {
                            Rectangle()
                                .fill(Color.white.opacity(0.12))
                                .frame(height: 1)

                            Button {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    showEmailForm.toggle()
                                }
                            } label: {
                                HStack(spacing: 5) {
                                    Text("אימייל וסיסמה")
                                        .font(SederTheme.ploni(13))
                                        .foregroundStyle(Color.white.opacity(0.4))
                                        .fixedSize()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundStyle(Color.white.opacity(0.4))
                                        .rotationEffect(.degrees(showEmailForm ? 180 : 0))
                                }
                            }

                            Rectangle()
                                .fill(Color.white.opacity(0.12))
                                .frame(height: 1)
                        }

                        // Email form
                        if showEmailForm {
                            VStack(spacing: 12) {
                                // Email
                                HStack(spacing: 12) {
                                    Image(systemName: "envelope")
                                        .font(.system(size: 15, weight: .light))
                                        .foregroundStyle(Color.white.opacity(0.35))
                                        .frame(width: 20)

                                    TextField("", text: $email, prompt: Text("אימייל").foregroundColor(Color.white.opacity(0.3)))
                                        .textFieldStyle(.plain)
                                        .textContentType(.emailAddress)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .foregroundStyle(.white)
                                        .font(SederTheme.ploni(15))
                                }
                                .environment(\.layoutDirection, .leftToRight)
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.08))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                        )
                                )

                                // Password
                                HStack(spacing: 12) {
                                    Image(systemName: "lock")
                                        .font(.system(size: 15, weight: .light))
                                        .foregroundStyle(Color.white.opacity(0.35))
                                        .frame(width: 20)

                                    Group {
                                        if showPassword {
                                            TextField("", text: $password, prompt: Text("סיסמה").foregroundColor(Color.white.opacity(0.3)))
                                                .textFieldStyle(.plain)
                                                .textContentType(.password)
                                        } else {
                                            SecureField("", text: $password, prompt: Text("סיסמה").foregroundColor(Color.white.opacity(0.3)))
                                                .textFieldStyle(.plain)
                                                .textContentType(.password)
                                        }
                                    }
                                    .foregroundStyle(.white)
                                    .font(SederTheme.ploni(15))

                                    Button {
                                        showPassword.toggle()
                                    } label: {
                                        Image(systemName: showPassword ? "eye.slash" : "eye")
                                            .font(.system(size: 14))
                                            .foregroundStyle(Color.white.opacity(0.3))
                                    }
                                }
                                .environment(\.layoutDirection, .leftToRight)
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.08))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                        )
                                )

                                // Login button
                                Button {
                                    Task { await auth.signIn(email: email, password: password) }
                                } label: {
                                    Group {
                                        if auth.isLoading {
                                            ProgressView()
                                                .tint(.white)
                                        } else {
                                            Text("התחברות")
                                                .font(SederTheme.ploni(16, weight: .bold))
                                                .foregroundStyle(.white)
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(
                                                email.isEmpty || password.isEmpty || auth.isLoading
                                                    ? accentGreen.opacity(0.4)
                                                    : accentGreen
                                            )
                                    )
                                }
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
                            }
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    .padding(.horizontal, 32)

                    Spacer().frame(height: 40)

                    // Footer
                    VStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Text("אין לכם חשבון?")
                                .font(SederTheme.ploni(14))
                                .foregroundStyle(Color.white.opacity(0.4))
                            Button("הרשמה") {
                                showSignUp = true
                            }
                            .font(SederTheme.ploni(14, weight: .bold))
                            .foregroundStyle(accentGreen)
                        }

                        Text("בהמשך, אתם מסכימים לתנאי השימוש ומדיניות הפרטיות")
                            .font(SederTheme.ploni(11))
                            .foregroundStyle(Color.white.opacity(0.2))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .sheet(isPresented: $showSignUp) {
            SignUpView()
                .environmentObject(auth)
        }
    }
}
