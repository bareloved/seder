import Foundation

nonisolated struct Client: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let notes: String?
    let defaultRate: FlexibleValue?
    let isArchived: Bool
    let displayOrder: FlexibleValue?
    let createdAt: String?
    let updatedAt: String?

    // Analytics fields (optional, only when ?analytics=true)
    let totalEarned: Double?
    let thisMonthRevenue: Double?
    let thisYearRevenue: Double?
    let averagePerJob: Double?
    let jobCount: Int?
    let outstandingAmount: Double?
    let avgDaysToPayment: Double?
    let overdueInvoices: Int?
}

/// Handles JSON values that can be either a string or a number
nonisolated enum FlexibleValue: Codable, Sendable {
    case string(String)
    case number(Double)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let str = try? container.decode(String.self) {
            self = .string(str)
        } else if let num = try? container.decode(Double.self) {
            self = .number(num)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .number(let n): try container.encode(n)
        case .null: try container.encodeNil()
        }
    }

    var stringValue: String? {
        switch self {
        case .string(let s): return s
        case .number(let n): return String(n)
        case .null: return nil
        }
    }

    var doubleValue: Double? {
        switch self {
        case .number(let n): return n
        case .string(let s): return Double(s)
        case .null: return nil
        }
    }
}

nonisolated struct CreateClientRequest: Encodable, Sendable {
    let name: String
    var email: String?
    var phone: String?
    var notes: String?
    var defaultRate: Double?
}

nonisolated struct UpdateClientRequest: Encodable, Sendable {
    var name: String?
    var email: String?
    var phone: String?
    var notes: String?
    var defaultRate: Double?
    var action: String?
}
