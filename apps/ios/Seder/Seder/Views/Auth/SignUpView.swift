import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var showEmailForm = false
    @State private var showPassword = false
    @State private var termsAccepted = false
    @State private var marketingOptIn = false

    private let bgTop = Color(red: 0.106, green: 0.263, blue: 0.196)
    private let bgBottom = Color(red: 0.059, green: 0.169, blue: 0.122)
    private let bandLight = Color(red: 0.14, green: 0.33, blue: 0.24)
    private let bandPale = Color(red: 0.17, green: 0.38, blue: 0.28)
    private let bandDark = Color(red: 0.08, green: 0.20, blue: 0.15)
    private let accentGreen = Color(red: 0.18, green: 0.80, blue: 0.44)

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [bgTop, bgBottom],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                // Subtle glow
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [accentGreen.opacity(0.10), .clear],
                            center: .center,
                            startRadius: 20,
                            endRadius: 180
                        )
                    )
                    .frame(width: 360, height: 360)
                    .offset(x: 0, y: -80)
                    .ignoresSafeArea()

                // Geometric bands
                GeometryReader { geo in
                    let w = geo.size.width
                    let h = geo.size.height

                    Path { p in
                        p.move(to: CGPoint(x: w * 0.3, y: 0))
                        p.addLine(to: CGPoint(x: w, y: 0))
                        p.addLine(to: CGPoint(x: w, y: h * 0.35))
                        p.addLine(to: CGPoint(x: w * 0.05, y: h * 0.1))
                        p.closeSubpath()
                    }
                    .fill(bandLight.opacity(0.4))

                    Path { p in
                        p.move(to: CGPoint(x: w * 0.55, y: 0))
                        p.addLine(to: CGPoint(x: w, y: 0))
                        p.addLine(to: CGPoint(x: w, y: h * 0.22))
                        p.addLine(to: CGPoint(x: w * 0.3, y: h * 0.05))
                        p.closeSubpath()
                    }
                    .fill(bandPale.opacity(0.3))

                    Ellipse()
                        .fill(bandDark.opacity(0.25))
                        .frame(width: w * 0.6, height: h * 0.18)
                        .rotationEffect(.degrees(-15))
                        .offset(x: -w * 0.2, y: h * 0.28)
                }
                .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        Spacer().frame(height: 24)

                        // Logo
                        SederLogo()
                            .frame(width: 50, height: 42)
                            .padding(.bottom, 24)

                        Text("יצירת חשבון")
                            .font(SederTheme.ploni(30, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.bottom, 6)

                        Text("צרו חשבון כדי להתחיל לעקוב אחרי ההכנסות")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(Color.white.opacity(0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                            .padding(.bottom, 36)

                        // MARK: - Form
                        VStack(spacing: 16) {
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

                            // Google
                            Button {
                                guard termsAccepted else {
                                    auth.errorMessage = "יש לאשר את תנאי השימוש ומדיניות הפרטיות"
                                    return
                                }
                                auth.stagePendingConsent(marketingOptIn: marketingOptIn)
                                Task {
                                    await auth.signInWithGoogle()
                                    if auth.isAuthenticated { dismiss() }
                                }
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

                            if showEmailForm {
                                VStack(spacing: 12) {
                                    iconInput(icon: "person") {
                                        TextField("", text: $name, prompt: Text("השם שלכם").foregroundColor(Color.white.opacity(0.3)))
                                            .textFieldStyle(.plain)
                                            .textContentType(.name)
                                            .foregroundStyle(.white)
                                            .font(SederTheme.ploni(15))
                                    }

                                    iconInput(icon: "envelope") {
                                        TextField("", text: $email, prompt: Text("name@example.com").foregroundColor(Color.white.opacity(0.3)))
                                            .textFieldStyle(.plain)
                                            .textContentType(.emailAddress)
                                            .keyboardType(.emailAddress)
                                            .autocapitalization(.none)
                                            .foregroundStyle(.white)
                                            .font(SederTheme.ploni(15))
                                    }

                                    HStack(spacing: 12) {
                                        Image(systemName: "lock")
                                            .font(.system(size: 15, weight: .light))
                                            .foregroundStyle(Color.white.opacity(0.35))
                                            .frame(width: 20)

                                        Group {
                                            if showPassword {
                                                TextField("", text: $password, prompt: Text("סיסמה").foregroundColor(Color.white.opacity(0.3)))
                                                    .textFieldStyle(.plain)
                                                    .textContentType(.newPassword)
                                            } else {
                                                SecureField("", text: $password, prompt: Text("סיסמה").foregroundColor(Color.white.opacity(0.3)))
                                                    .textFieldStyle(.plain)
                                                    .textContentType(.newPassword)
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

                                    if !password.isEmpty {
                                        PasswordCheck(label: "לפחות 8 תווים", passed: password.count >= 8)
                                    }

                                    // Consent checkboxes — required by Israeli law
                                    consentCheckbox(
                                        isOn: $termsAccepted,
                                        text: "אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות *",
                                        showLink: true
                                    )
                                    consentCheckbox(
                                        isOn: $marketingOptIn,
                                        text: "אני מסכים/ה לקבל עדכונים שיווקיים ודיוור במייל. ניתן להסיר בכל עת.",
                                        showLink: false
                                    )

                                    // CTA
                                    Button {
                                        guard termsAccepted else { return }
                                        auth.stagePendingConsent(marketingOptIn: marketingOptIn)
                                        Task {
                                            await auth.signUp(name: name, email: email, password: password)
                                            if auth.isAuthenticated { dismiss() }
                                        }
                                    } label: {
                                        Group {
                                            if auth.isLoading {
                                                ProgressView()
                                                    .tint(.white)
                                            } else {
                                                Text("יצירת חשבון")
                                                    .font(SederTheme.ploni(16, weight: .bold))
                                                    .foregroundStyle(.white)
                                            }
                                        }
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 52)
                                        .background(
                                            RoundedRectangle(cornerRadius: 14)
                                                .fill(
                                                    name.isEmpty || email.isEmpty || password.count < 8 || !termsAccepted || auth.isLoading
                                                        ? accentGreen.opacity(0.4)
                                                        : accentGreen
                                                )
                                        )
                                    }
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .disabled(name.isEmpty || email.isEmpty || password.count < 8 || !termsAccepted || auth.isLoading)
                                }
                                .transition(.opacity.combined(with: .move(edge: .top)))
                            }
                        }
                        .padding(.horizontal, 32)

                        Spacer().frame(height: 40)

                        VStack(spacing: 12) {
                            HStack(spacing: 4) {
                                Text("כבר יש לכם חשבון?")
                                    .font(SederTheme.ploni(14))
                                    .foregroundStyle(Color.white.opacity(0.4))
                                Button("התחברות") { dismiss() }
                                    .font(SederTheme.ploni(14, weight: .bold))
                                    .foregroundStyle(accentGreen)
                            }

                            HStack(spacing: 8) {
                                Link("תנאי השימוש", destination: URL(string: "https://sedder.app/terms")!)
                                    .font(SederTheme.ploni(11, weight: .medium))
                                    .foregroundStyle(Color.white.opacity(0.4))
                                Text("·")
                                    .foregroundStyle(Color.white.opacity(0.25))
                                Link("מדיניות הפרטיות", destination: URL(string: "https://sedder.app/privacy")!)
                                    .font(SederTheme.ploni(11, weight: .medium))
                                    .foregroundStyle(Color.white.opacity(0.4))
                            }
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.4))
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    @ViewBuilder
    private func consentCheckbox(isOn: Binding<Bool>, text: String, showLink: Bool) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: isOn.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.system(size: 18))
                    .foregroundStyle(isOn.wrappedValue ? accentGreen : Color.white.opacity(0.45))
                VStack(alignment: .trailing, spacing: 2) {
                    Text(text)
                        .font(SederTheme.ploni(12))
                        .foregroundStyle(Color.white.opacity(0.7))
                        .multilineTextAlignment(.trailing)
                        .fixedSize(horizontal: false, vertical: true)
                    if showLink {
                        HStack(spacing: 6) {
                            Link("תנאים", destination: URL(string: "https://sedder.app/terms")!)
                            Text("·").foregroundStyle(Color.white.opacity(0.3))
                            Link("פרטיות", destination: URL(string: "https://sedder.app/privacy")!)
                        }
                        .font(SederTheme.ploni(11, weight: .medium))
                        .foregroundStyle(accentGreen)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .buttonStyle(.plain)
    }

    private func iconInput<Content: View>(icon: String, @ViewBuilder content: () -> Content) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .light))
                .foregroundStyle(Color.white.opacity(0.35))
                .frame(width: 20)

            content()
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
    }
}

struct PasswordCheck: View {
    let label: String
    let passed: Bool

    private let accentGreen = Color(red: 0.18, green: 0.80, blue: 0.44)

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: passed ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
            Text(label)
                .font(SederTheme.ploni(12))
        }
        .foregroundStyle(passed ? accentGreen : Color.white.opacity(0.3))
    }
}
