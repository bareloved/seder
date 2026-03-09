import Foundation

nonisolated struct GoogleCalendar: Codable, Identifiable, Sendable {
    let id: String
    let summary: String
    let primary: Bool?
}

nonisolated struct CalendarEvent: Codable, Identifiable, Sendable {
    let id: String
    let summary: String
    let start: String  // ISO date string
    let end: String
    let calendarId: String
    let alreadyImported: Bool
}

nonisolated struct ClassificationRule: Codable, Identifiable, Sendable {
    let id: String
    let type: String       // "work" or "personal"
    let matchType: String  // "title" or "calendar"
    var keywords: [String]
    var enabled: Bool
}

struct ClassificationResult {
    let eventId: String
    let isWork: Bool
    let confidence: Double
    let matchedRule: String?
    let matchedKeyword: String?
}

struct ClassifiedEvent: Identifiable {
    let event: CalendarEvent
    let isWork: Bool
    let confidence: Double
    var selected: Bool
    var id: String { event.id }
}
