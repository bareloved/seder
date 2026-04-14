import Foundation

nonisolated enum Cadence: Codable, Sendable, Equatable {
    case daily(interval: Int)
    case weekly(interval: Int, weekdays: [Int])
    case monthly(interval: Int, dayOfMonth: Int)

    private enum CodingKeys: String, CodingKey {
        case kind, interval, weekdays, dayOfMonth
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try c.decode(String.self, forKey: .kind)
        let interval = try c.decode(Int.self, forKey: .interval)
        switch kind {
        case "daily":
            self = .daily(interval: interval)
        case "weekly":
            let weekdays = try c.decode([Int].self, forKey: .weekdays)
            self = .weekly(interval: interval, weekdays: weekdays)
        case "monthly":
            let dayOfMonth = try c.decode(Int.self, forKey: .dayOfMonth)
            self = .monthly(interval: interval, dayOfMonth: dayOfMonth)
        default:
            throw DecodingError.dataCorruptedError(forKey: .kind, in: c, debugDescription: "Unknown cadence kind: \(kind)")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .daily(let interval):
            try c.encode("daily", forKey: .kind)
            try c.encode(interval, forKey: .interval)
        case .weekly(let interval, let weekdays):
            try c.encode("weekly", forKey: .kind)
            try c.encode(interval, forKey: .interval)
            try c.encode(weekdays, forKey: .weekdays)
        case .monthly(let interval, let dayOfMonth):
            try c.encode("monthly", forKey: .kind)
            try c.encode(interval, forKey: .interval)
            try c.encode(dayOfMonth, forKey: .dayOfMonth)
        }
    }
}

nonisolated struct RollingJob: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let isActive: Bool
    let title: String
    let description: String
    let clientId: String?
    let clientName: String
    let categoryId: String?
    let amountGross: String
    let vatRate: String
    let includesVat: Bool
    let defaultInvoiceStatus: InvoiceStatus
    let cadence: Cadence
    let startDate: String
    let endDate: String?
    let sourceCalendarRecurringEventId: String?
    let sourceCalendarId: String?
    let notes: String?
    let createdAt: String
    let updatedAt: String
}

nonisolated struct CreateRollingJobInput: Codable, Sendable {
    let title: String
    let description: String
    let clientId: String?
    let clientName: String
    let categoryId: String?
    let amountGross: String
    let vatRate: String?
    let includesVat: Bool?
    let cadence: Cadence
    let startDate: String
    let endDate: String?
    let notes: String?
}

nonisolated struct UpdateRollingJobInput: Codable, Sendable {
    let title: String?
    let description: String?
    let clientId: String?
    let clientName: String?
    let categoryId: String?
    let amountGross: String?
    let vatRate: String?
    let includesVat: Bool?
    let cadence: Cadence?
    let startDate: String?
    let endDate: String?
    let notes: String?
}
