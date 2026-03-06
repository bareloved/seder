import Foundation

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

nonisolated struct MonthTrend: Codable, Sendable {
    let month: Int
    let status: String // "all-paid" | "has-unpaid" | "empty"
}
