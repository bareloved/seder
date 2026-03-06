import Foundation

struct UserSettings: Codable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
}

struct UpdateSettingsRequest: Encodable {
    var theme: String?
    var language: String?
}
