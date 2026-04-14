import Foundation

nonisolated struct IncomeEntry: Codable, Identifiable, Sendable {
    let id: String
    let date: String
    let description: String
    let clientName: String
    let clientId: String?
    let amountGross: String // numeric from API
    let amountPaid: String
    let vatRate: String
    let includesVat: Bool
    let invoiceStatus: InvoiceStatus
    let paymentStatus: PaymentStatus
    let categoryId: String?
    let categoryData: CategoryData?
    let notes: String?
    let invoiceSentDate: String?
    let paidDate: String?
    let calendarEventId: String?
    let rollingJobId: String?
    let detachedFromTemplate: Bool?
    let createdAt: String?
    let updatedAt: String?

    // Computed helpers
    var grossAmount: Double { Double(amountGross) ?? 0 }
    var paidAmount: Double { Double(amountPaid) ?? 0 }
    var vat: Double { Double(vatRate) ?? 18 }
}

nonisolated enum InvoiceStatus: String, Codable, CaseIterable, Sendable {
    case draft, sent, paid, cancelled

    var label: String {
        switch self {
        case .draft: return "טיוטה"
        case .sent: return "נשלח"
        case .paid: return "שולם"
        case .cancelled: return "בוטל"
        }
    }
}

nonisolated enum PaymentStatus: String, Codable, CaseIterable, Sendable {
    case unpaid, partial, paid

    var label: String {
        switch self {
        case .unpaid: return "לא שולם"
        case .partial: return "שולם חלקית"
        case .paid: return "שולם"
        }
    }
}

nonisolated struct CategoryData: Codable, Sendable {
    let id: String
    let name: String
    let color: String
    let icon: String
}

nonisolated struct CreateIncomeRequest: Encodable, Sendable {
    let date: String
    let description: String
    var clientName: String = ""
    var clientId: String?
    let amountGross: Double
    var amountPaid: Double = 0
    var vatRate: Double = 18
    var includesVat: Bool = true
    var invoiceStatus: String = "draft"
    var paymentStatus: String = "unpaid"
    var categoryId: String?
    var calendarEventId: String?
    var notes: String?
}

nonisolated struct UpdateIncomeRequest: Encodable, Sendable {
    var date: String?
    var description: String?
    var clientName: String?
    var clientId: String?
    var amountGross: Double?
    var amountPaid: Double?
    var vatRate: Double?
    var includesVat: Bool?
    var invoiceStatus: String?
    var paymentStatus: String?
    var categoryId: String?
    var notes: String?
}

// MARK: - Batch Operations

nonisolated struct BatchIncomeRequest: Encodable, Sendable {
    let action: String
    let ids: [String]
    var updates: BatchUpdates?
}

nonisolated struct BatchUpdates: Encodable, Sendable {
    var invoiceStatus: String?
    var paymentStatus: String?
}

nonisolated struct BatchResult: Decodable, Sendable {
    var deletedCount: Int?
    var updatedCount: Int?
}
