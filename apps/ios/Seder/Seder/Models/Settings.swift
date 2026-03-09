import Foundation

nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
    let calendarSettings: CalendarSettingsData?
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

nonisolated struct ExportRequest: Encodable, Sendable {
    let includeIncomeEntries: Bool
    let includeCategories: Bool
    let dateRange: String
}

nonisolated struct ExportResponse: Decodable, Sendable {
    let csv: String?
}
