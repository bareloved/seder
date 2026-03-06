import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Text("הרשמה")
                    .font(.title.bold())

                VStack(spacing: 16) {
                    TextField("שם מלא", text: $name)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.name)

                    TextField("אימייל", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)

                    SecureField("סיסמה (8 תווים לפחות)", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)
                        .environment(\.layoutDirection, .leftToRight)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await auth.signUp(name: name, email: email, password: password)
                            if auth.isAuthenticated { dismiss() }
                        }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("הרשמה")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading)
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
