import Combine
import Foundation

@MainActor
class IncomeViewModel: ObservableObject {
    @Published var entries: [IncomeEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedMonth = Date()

    private let api = APIClient.shared

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    func loadEntries() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            entries = try await api.request(
                endpoint: "/api/v1/income",
                queryItems: [URLQueryItem(name: "month", value: monthString)]
            )
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בטעינת נתונים"
        }
    }

    func deleteEntry(_ id: String) async {
        do {
            let _: [String: Bool] = try await api.request(
                endpoint: "/api/v1/income/\(id)",
                method: "DELETE"
            )
            entries.removeAll { $0.id == id }
        } catch {
            errorMessage = "שגיאה במחיקה"
        }
    }

    func createEntry(_ request: CreateIncomeRequest) async -> Bool {
        do {
            let entry: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income",
                method: "POST",
                body: request
            )
            entries.insert(entry, at: 0)
            return true
        } catch let error as APIError {
            errorMessage = error.errorDescription
            return false
        } catch {
            errorMessage = "שגיאה ביצירת רשומה"
            return false
        }
    }

    func updateEntry(_ id: String, _ request: UpdateIncomeRequest) async -> Bool {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)",
                method: "PUT",
                body: request
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
            return true
        } catch let error as APIError {
            errorMessage = error.errorDescription
            return false
        } catch {
            errorMessage = "שגיאה בעדכון"
            return false
        }
    }

    func markSent(_ id: String) async {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)/mark-sent",
                method: "POST"
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
        } catch {
            errorMessage = "שגיאה בעדכון סטטוס"
        }
    }

    func markPaid(_ id: String) async {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)/mark-paid",
                method: "POST"
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
        } catch {
            errorMessage = "שגיאה בעדכון סטטוס"
        }
    }
}
