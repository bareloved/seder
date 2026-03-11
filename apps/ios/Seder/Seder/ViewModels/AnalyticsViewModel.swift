import Combine
import Foundation

enum ReportSection: Hashable {
    case incomeChart
    case invoiceTracking
    case categoryBreakdown
    case vatSummary
}

@MainActor
class AnalyticsViewModel: ObservableObject {
    // MARK: - Data
    @Published var aggregates: IncomeAggregates?
    @Published var trends: [EnhancedMonthTrend] = []
    @Published var categories: [CategoryBreakdown] = []
    @Published var attention: AttentionResponse?

    // MARK: - State
    @Published var isLoading = false
    @Published var isReloading = false
    @Published var selectedMonth = Date()
    @Published var expandedSections: Set<ReportSection> = [.incomeChart]

    // MARK: - Per-section errors
    @Published var kpiError = false
    @Published var trendsError = false
    @Published var categoriesError = false
    @Published var attentionError = false

    private let api = APIClient.shared

    // MARK: - Computed

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    var hasData: Bool {
        aggregates != nil && (aggregates?.jobsCount ?? 0) > 0
    }

    var attentionCount: Int {
        guard let s = attention?.summary else { return 0 }
        return s.drafts.count + s.sent.count + s.overdue.count
    }

    // MARK: - Section Toggle

    func toggleSection(_ section: ReportSection) {
        if expandedSections.contains(section) {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }
    }

    func isSectionExpanded(_ section: ReportSection) -> Bool {
        expandedSections.contains(section)
    }

    // MARK: - Data Loading

    func loadAll() async {
        let isInitial = aggregates == nil
        if isInitial {
            isLoading = true
        } else {
            isReloading = true
        }
        defer {
            isLoading = false
            isReloading = false
        }

        // Reset errors
        kpiError = false
        trendsError = false
        categoriesError = false
        attentionError = false

        async let kpis: IncomeAggregates = api.request(
            endpoint: "/api/v1/analytics/kpis",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let monthTrends: [EnhancedMonthTrend] = api.request(
            endpoint: "/api/v1/analytics/trends",
            queryItems: [
                URLQueryItem(name: "month", value: monthString),
                URLQueryItem(name: "count", value: "6"),
            ]
        )
        async let cats: [CategoryBreakdown] = api.request(
            endpoint: "/api/v1/analytics/categories",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let att: AttentionResponse = api.request(
            endpoint: "/api/v1/analytics/attention",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )

        // Settle each independently
        do { aggregates = try await kpis } catch { kpiError = true }
        do { trends = try await monthTrends } catch { trendsError = true }
        do { categories = try await cats } catch { categoriesError = true }
        do { attention = try await att } catch { attentionError = true }
    }

    func retrySection(_ section: ReportSection) async {
        switch section {
        case .incomeChart:
            trendsError = false
            do {
                trends = try await api.request(
                    endpoint: "/api/v1/analytics/trends",
                    queryItems: [
                        URLQueryItem(name: "month", value: monthString),
                        URLQueryItem(name: "count", value: "6"),
                    ]
                )
            } catch { trendsError = true }
        case .invoiceTracking:
            attentionError = false
            do {
                attention = try await api.request(
                    endpoint: "/api/v1/analytics/attention",
                    queryItems: [URLQueryItem(name: "month", value: monthString)]
                )
            } catch { attentionError = true }
        case .categoryBreakdown:
            categoriesError = false
            do {
                categories = try await api.request(
                    endpoint: "/api/v1/analytics/categories",
                    queryItems: [URLQueryItem(name: "month", value: monthString)]
                )
            } catch { categoriesError = true }
        case .vatSummary:
            // VAT uses KPI data
            kpiError = false
            do {
                aggregates = try await api.request(
                    endpoint: "/api/v1/analytics/kpis",
                    queryItems: [URLQueryItem(name: "month", value: monthString)]
                )
            } catch { kpiError = true }
        }
    }
}
