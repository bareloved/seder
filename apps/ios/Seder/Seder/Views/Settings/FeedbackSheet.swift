import SwiftUI

struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var message = ""
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                ZStack(alignment: .topTrailing) {
                    TextEditor(text: $message)
                        .frame(minHeight: 150)
                        .padding(8)
                        .scrollContentBackground(.hidden)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)

                    if message.isEmpty {
                        Text("ספרו לנו מה אתם חושבים...")
                            .foregroundColor(.secondary)
                            .padding(.top, 16)
                            .padding(.trailing, 16)
                            .allowsHitTesting(false)
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                Button {
                    Task { await sendFeedback() }
                } label: {
                    if isSending {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("שלח משוב")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(SederTheme.brandGreen)
                .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)

                Spacer()
            }
            .padding()
            .navigationTitle("שליחת משוב")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגור") { dismiss() }
                }
            }
            .alert("המשוב נשלח בהצלחה!", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
    }

    private func sendFeedback() async {
        isSending = true
        errorMessage = nil

        do {
            struct FeedbackRequest: Encodable {
                let message: String
                let platform: String
            }
            let body = FeedbackRequest(message: message, platform: "ios")
            let _: EmptyData = try await APIClient.shared.request(
                endpoint: "/api/v1/feedback",
                method: "POST",
                body: body
            )
            showSuccess = true
        } catch {
            errorMessage = "שגיאה בשליחת המשוב. נסו שוב."
        }

        isSending = false
    }
}
