import SwiftUI

struct CalendarImportView: View {
    @Environment(\.dismiss) var dismiss
    @State private var isLoading = false
    @State private var importedCount: Int?
    @State private var errorMessage: String?
    @State private var selectedMonth = Date()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 64))
                    .foregroundStyle(.blue)

                Text("ייבוא מיומן Google")
                    .font(.title2.bold())

                Text("ייבוא אירועים מיומן Google כרשומות הכנסה")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                MonthPicker(selectedDate: $selectedMonth)

                if let count = importedCount {
                    Text("יובאו \(count) רשומות בהצלחה")
                        .foregroundStyle(.green)
                        .font(.headline)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }

                Button {
                    Task { await importEvents() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("ייבוא אירועים")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, 32)
                .disabled(isLoading)

                Spacer()
            }
            .padding()
            .navigationTitle("ייבוא יומן")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
        }
    }

    private func importEvents() async {
        isLoading = true
        importedCount = nil
        errorMessage = nil
        defer { isLoading = false }

        let calendar = Calendar.current
        let year = calendar.component(.year, from: selectedMonth)
        let month = calendar.component(.month, from: selectedMonth)

        struct ImportRequest: Encodable {
            let year: Int
            let month: Int
        }
        struct ImportResponse: Decodable {
            let importedCount: Int
        }

        do {
            let result: ImportResponse = try await APIClient.shared.request(
                endpoint: "/api/v1/calendar/import",
                method: "POST",
                body: ImportRequest(year: year, month: month)
            )
            importedCount = result.importedCount
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בייבוא"
        }
    }
}
