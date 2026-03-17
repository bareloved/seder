import SwiftUI

struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var message = ""
    @State private var category = "general"
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(SederTheme.brandGreen.opacity(0.15))
                            .frame(width: 56, height: 56)
                        Image(systemName: "bubble.left.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(SederTheme.brandGreen)
                    }

                    Text("נשמח לשמוע מכם!")
                        .font(SederTheme.ploni(18, weight: .semibold))
                        .foregroundStyle(SederTheme.textPrimary)

                    Text("המשוב שלכם עוזר לנו לשפר את האפליקציה")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textSecondary)
                }
                .padding(.top, 8)

                // Category picker
                HStack(spacing: 8) {
                    ForEach([
                        ("general", "משוב כללי", "bubble.left"),
                        ("bug", "דיווח באג", "ladybug"),
                        ("feature", "בקשת פיצ׳ר", "lightbulb"),
                    ], id: \.0) { id, label, icon in
                        Button {
                            category = id
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: icon)
                                    .font(.system(size: 12))
                                Text(label)
                                    .font(SederTheme.ploni(13, weight: .medium))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(category == id ? SederTheme.brandGreen.opacity(0.15) : SederTheme.subtleBg)
                            .foregroundStyle(category == id ? SederTheme.brandGreen : SederTheme.textSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(category == id ? SederTheme.brandGreen.opacity(0.4) : Color.clear, lineWidth: 1)
                            )
                        }
                    }
                }

                // Text input
                ZStack(alignment: .topLeading) {
                    TextEditor(text: $message)
                        .frame(minHeight: 140)
                        .padding(12)
                        .scrollContentBackground(.hidden)
                        .background(SederTheme.subtleBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                        .font(SederTheme.ploni(16))
                        .environment(\.layoutDirection, .rightToLeft)

                    if message.isEmpty {
                        Text("ספרו לנו מה אתם חושבים...")
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textTertiary)
                            .padding(.top, 20)
                            .padding(.leading, 16)
                            .allowsHitTesting(false)
                    }
                }

                // Character count
                HStack {
                    Text("\(message.count)/5000")
                        .font(SederTheme.ploni(12))
                        .foregroundStyle(message.count > 4500 ? .red : SederTheme.textTertiary)
                    Spacer()
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Send button
                Button {
                    Task { await sendFeedback() }
                } label: {
                    HStack(spacing: 8) {
                        if isSending {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 14))
                        }
                        Text("שליחת משוב")
                            .font(SederTheme.ploni(16, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending
                            ? SederTheme.brandGreen.opacity(0.5)
                            : SederTheme.brandGreen
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)

                Spacer()
            }
            .padding(.horizontal, 20)
            .background(SederTheme.pageBg)
            .navigationTitle("משוב")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
            .alert("המשוב נשלח בהצלחה!", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            } message: {
                Text("תודה שעזרתם לנו להשתפר")
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func sendFeedback() async {
        isSending = true
        errorMessage = nil

        do {
            struct FeedbackRequest: Encodable {
                let message: String
                let platform: String
                let category: String
            }
            let body = FeedbackRequest(message: message, platform: "ios", category: category)
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
