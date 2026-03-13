import Foundation

nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
    let calendarSettings: CalendarSettingsData?
    let nudgeInvoiceDays: StringOrInt?
    let nudgePaymentDays: StringOrInt?
    let nudgePushEnabled: NudgePushPreferences?
}

/// Handles JSON values that can be either String or Int (Drizzle numeric columns return strings)
nonisolated enum StringOrInt: Codable, Sendable {
    case string(String)
    case int(Int)

    var intValue: Int {
        switch self {
        case .string(let s): return Int(s) ?? 0
        case .int(let i): return i
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let i = try? container.decode(Int.self) {
            self = .int(i)
        } else if let s = try? container.decode(String.self) {
            self = .string(s)
        } else {
            throw DecodingError.typeMismatch(StringOrInt.self, .init(codingPath: decoder.codingPath, debugDescription: "Expected String or Int"))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .int(let i): try container.encode(i)
        }
    }
}

nonisolated struct NudgePushPreferences: Codable, Sendable {
    var uninvoiced: Bool
    var batch_invoice: Bool
    var overdue_payment: Bool
    var way_overdue: Bool
    var partial_stale: Bool
    var unlogged_calendar: Bool
    var month_end: Bool

    static let defaults = NudgePushPreferences(
        uninvoiced: true,
        batch_invoice: true,
        overdue_payment: true,
        way_overdue: true,
        partial_stale: true,
        unlogged_calendar: false,
        month_end: true
    )
}

nonisolated struct UpdateSettingsRequest: Encodable, Sendable {
    var theme: String?
    var language: String?
    var timezone: String?
    var defaultCurrency: String?
}

nonisolated struct CalendarSettingsData: Codable, Sendable {
    let rules: [ClassificationRule]?
    let selectedCalendarIds: [String]?
}

nonisolated struct UpdateNudgeSettingsRequest: Encodable, Sendable {
    let nudgeInvoiceDays: String
    let nudgePaymentDays: String
    let nudgePushEnabled: NudgePushPreferences
}

nonisolated struct ExportRequest: Encodable, Sendable {
    let includeIncomeEntries: Bool
    let includeCategories: Bool
    let dateRange: String
}

nonisolated struct ExportResponse: Decodable, Sendable {
    let csv: String?
}
