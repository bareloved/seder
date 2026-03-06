import Foundation

struct IncomeAggregates: Codable {
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

struct MonthTrend: Codable {
    let month: Int
    let status: String // "all-paid" | "has-unpaid" | "empty"
}
