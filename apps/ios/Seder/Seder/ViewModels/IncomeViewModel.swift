import Combine
import Foundation

@MainActor
class IncomeViewModel: ObservableObject {
    @Published var entries: [IncomeEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedMonth = Date()
    enum MonthStatus { case empty, allPaid, hasUnpaid }
    @Published var monthStatuses: [Int: MonthStatus] = [:]

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
            // Update status for this month
            let month = Calendar.current.component(.month, from: selectedMonth)
            if entries.isEmpty {
                monthStatuses[month] = .empty
            } else {
                monthStatuses[month] = entries.contains(where: { $0.paymentStatus != .paid }) ? .hasUnpaid : .allPaid
            }
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בטעינת נתונים"
        }
    }

    /// Refresh statuses after a mutation so the month picker dots stay current
    private func refreshCurrentMonthStatus() {
        let month = Calendar.current.component(.month, from: selectedMonth)
        if entries.isEmpty {
            monthStatuses[month] = .empty
        } else {
            monthStatuses[month] = entries.contains(where: { $0.paymentStatus != .paid }) ? .hasUnpaid : .allPaid
        }
    }

    func loadAllMonthStatuses() async {
        let year = Calendar.current.component(.year, from: selectedMonth)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"

        for month in 1...12 {
            var components = DateComponents()
            components.year = year
            components.month = month
            components.day = 1
            guard let date = Calendar.current.date(from: components) else { continue }
            let monthStr = formatter.string(from: date)

            do {
                let entries: [IncomeEntry] = try await api.request(
                    endpoint: "/api/v1/income",
                    queryItems: [URLQueryItem(name: "month", value: monthStr)]
                )
                if entries.isEmpty {
                    monthStatuses[month] = .empty
                } else {
                    monthStatuses[month] = entries.contains(where: { $0.paymentStatus != .paid }) ? .hasUnpaid : .allPaid
                }
            } catch {
                // Skip failed months
            }
        }
    }

    func deleteEntry(_ id: String) async {
        do {
            let _: [String: Bool] = try await api.request(
                endpoint: "/api/v1/income/\(id)",
                method: "DELETE"
            )
            entries.removeAll { $0.id == id }
            refreshCurrentMonthStatus()
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
            refreshCurrentMonthStatus()
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
            refreshCurrentMonthStatus()
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
            refreshCurrentMonthStatus()
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
            refreshCurrentMonthStatus()
        } catch {
            errorMessage = "שגיאה בעדכון סטטוס"
        }
    }
}
