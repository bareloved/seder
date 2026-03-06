import Foundation

nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
}

nonisolated struct UpdateSettingsRequest: Encodable, Sendable {
    var theme: String?
    var language: String?
}
