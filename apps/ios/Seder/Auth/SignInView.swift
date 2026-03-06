import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Logo / Title
                VStack(spacing: 8) {
                    Text("סדר")
                        .font(.system(size: 48, weight: .bold))
                    Text("ניהול הכנסות לפרילנסרים")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Form
                VStack(spacing: 16) {
                    TextField("אימייל", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)

                    SecureField("סיסמה", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
                        .environment(\.layoutDirection, .leftToRight)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await auth.signIn(email: email, password: password) }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("התחברות")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
                }
                .padding(.horizontal, 32)

                Button("אין לך חשבון? הירשם") {
                    showSignUp = true
                }
                .font(.footnote)

                Spacer()
            }
            .sheet(isPresented: $showSignUp) {
                SignUpView()
                    .environmentObject(auth)
            }
        }
    }
}
