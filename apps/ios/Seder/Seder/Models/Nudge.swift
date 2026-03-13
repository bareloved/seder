import Foundation

nonisolated struct Nudge: Codable, Identifiable, Sendable {
    let id: String
    let nudgeType: String
    let entryId: String?
    let periodKey: String?
    let priority: Int
    let title: String
    let description: String
    let actionType: String
    let entryDescription: String?
    let clientName: String?
    let amountGross: Double?
    let daysSince: Int?
}

nonisolated struct DismissNudgeRequest: Codable, Sendable {
    let nudgeType: String
    let entryId: String?
    let periodKey: String?
    let snooze: Bool?
}
