import SwiftUI

struct ChangeEmailView: View {
    @Environment(\.dismiss) var dismiss
    @State private var newEmail = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccess = false

    let currentEmail: String

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text(currentEmail)
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textSecondary)
                        Spacer()
                        Text("אימייל נוכחי")
                            .font(SederTheme.ploni(14))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                }

                Section {
                    TextField("אימייל חדש", text: $newEmail)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(SederTheme.ploni(14))
                }
            }
            .navigationTitle("שינוי אימייל")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        Task { await changeEmail() }
                    }
                    .disabled(newEmail.isEmpty || isLoading)
                }
            }
            .alert("האימייל שונה בהצלחה", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func changeEmail() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            struct ChangeEmailRequest: Encodable {
                let newEmail: String
            }
            let _: EmptyData = try await APIClient.shared.directRequest(
                endpoint: "/api/auth/change-email",
                method: "POST",
                body: ChangeEmailRequest(newEmail: newEmail)
            )
            showSuccess = true
        } catch {
            errorMessage = "שגיאה בשינוי אימייל"
        }
    }
}
