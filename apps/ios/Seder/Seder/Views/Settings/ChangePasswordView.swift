import SwiftUI

struct ChangePasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("סיסמה נוכחית", text: $currentPassword)
                        .environment(\.layoutDirection, .leftToRight)
                    SecureField("סיסמה חדשה", text: $newPassword)
                        .environment(\.layoutDirection, .leftToRight)
                    SecureField("אימות סיסמה חדשה", text: $confirmPassword)
                        .environment(\.layoutDirection, .leftToRight)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
            .navigationTitle("שינוי סיסמה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        Task { await changePassword() }
                    }
                    .disabled(isFormInvalid || isLoading)
                }
            }
            .alert("הסיסמה שונתה בהצלחה", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private var isFormInvalid: Bool {
        currentPassword.isEmpty || newPassword.count < 8 || newPassword != confirmPassword
    }

    private func changePassword() async {
        guard newPassword == confirmPassword else {
            errorMessage = "הסיסמאות אינן תואמות"
            return
        }
        isLoading = true
        defer { isLoading = false }

        do {
            struct ChangePasswordRequest: Encodable {
                let currentPassword: String
                let newPassword: String
            }
            let _: EmptyData = try await APIClient.shared.request(
                endpoint: "/api/auth/change-password",
                method: "POST",
                body: ChangePasswordRequest(currentPassword: currentPassword, newPassword: newPassword)
            )
            showSuccess = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בשינוי סיסמה"
        }
    }
}
