import Combine
import Foundation

@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var aggregates: IncomeAggregates?
    @Published var trends: [MonthTrend] = []
    @Published var isLoading = false
    @Published var selectedMonth = Date()

    private let api = APIClient.shared

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    var yearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy"
        return formatter.string(from: selectedMonth)
    }

    func loadAll() async {
        isLoading = true
        defer { isLoading = false }

        async let kpis: IncomeAggregates = api.request(
            endpoint: "/api/v1/analytics/kpis",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let monthTrends: [MonthTrend] = api.request(
            endpoint: "/api/v1/analytics/trends",
            queryItems: [URLQueryItem(name: "year", value: yearString)]
        )

        do {
            aggregates = try await kpis
            trends = try await monthTrends
        } catch {
            // Silently handle — show whatever loaded
        }
    }
}
