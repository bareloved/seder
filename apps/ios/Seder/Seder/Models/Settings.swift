import Foundation

nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
    let calendarSettings: CalendarSettingsData?
    let nudgeWeeklyDay: Int?
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
    var overdue: Bool
    var day_after_gig: Bool
    var weekly_uninvoiced: Bool
    var calendar_sync: Bool
    var unpaid_check: Bool

    static let defaults = NudgePushPreferences(
        overdue: true,
        day_after_gig: true,
        weekly_uninvoiced: true,
        calendar_sync: true,
        unpaid_check: true
    )

    init(overdue: Bool = true, day_after_gig: Bool = true, weekly_uninvoiced: Bool = true, calendar_sync: Bool = true, unpaid_check: Bool = true) {
        self.overdue = overdue
        self.day_after_gig = day_after_gig
        self.weekly_uninvoiced = weekly_uninvoiced
        self.calendar_sync = calendar_sync
        self.unpaid_check = unpaid_check
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        overdue = try container.decodeIfPresent(Bool.self, forKey: .overdue) ?? true
        day_after_gig = try container.decodeIfPresent(Bool.self, forKey: .day_after_gig) ?? true
        weekly_uninvoiced = try container.decodeIfPresent(Bool.self, forKey: .weekly_uninvoiced) ?? true
        calendar_sync = try container.decodeIfPresent(Bool.self, forKey: .calendar_sync) ?? true
        unpaid_check = try container.decodeIfPresent(Bool.self, forKey: .unpaid_check) ?? true
    }
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
    let nudgeWeeklyDay: Int
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
