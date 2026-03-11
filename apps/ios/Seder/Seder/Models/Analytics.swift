import Foundation

// MARK: - KPI Aggregates (existing, unchanged)

nonisolated struct IncomeAggregates: Codable, Sendable {
    let totalGross: Double
    let totalPaid: Double
    let totalUnpaid: Double
    let vatTotal: Double
    let jobsCount: Int
    let outstanding: Double
    let readyToInvoice: Double
    let readyToInvoiceCount: Int
    let invoicedCount: Int
    let overdueCount: Int
    let previousMonthPaid: Double
    let trend: Double
}

// MARK: - Enhanced Trends (replaces MonthTrend)

nonisolated struct EnhancedMonthTrend: Codable, Sendable, Identifiable {
    let month: Int
    let year: Int
    let status: String // "all-paid" | "has-unpaid" | "empty"
    let totalGross: Double
    let totalPaid: Double
    let jobsCount: Int

    var id: String { "\(year)-\(month)" }
}

// MARK: - Category Breakdown

nonisolated struct CategoryBreakdown: Codable, Sendable {
    let categoryId: String?
    let categoryName: String
    let categoryColor: String
    let amount: Double
    let count: Int
    let percentage: Double
}

// MARK: - Attention Items

nonisolated struct AttentionResponse: Codable, Sendable {
    let summary: AttentionSummary
    let items: [AttentionItem]
}

nonisolated struct AttentionSummary: Codable, Sendable {
    let drafts: AttentionBucket
    let sent: AttentionBucket
    let overdue: AttentionBucket
}

nonisolated struct AttentionBucket: Codable, Sendable {
    let count: Int
    let amount: Double
}

nonisolated struct AttentionItem: Codable, Sendable, Identifiable {
    let id: String
    let clientName: String
    let description: String
    let date: String
    let amountGross: Double
    let status: String // "draft" | "sent" | "overdue"
    let invoiceStatus: String
    let paymentStatus: String
}

// MARK: - Legacy (keep for backward compat during migration)

nonisolated struct MonthTrend: Codable, Sendable {
    let month: Int
    let status: String
}
