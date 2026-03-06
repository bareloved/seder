import Foundation

nonisolated struct Client: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let notes: String?
    let defaultRate: String?
    let isArchived: Bool
    let createdAt: String?
    let updatedAt: String?

    // Analytics fields (optional, only when ?analytics=true)
    let totalEarned: Double?
    let thisMonthRevenue: Double?
    let thisYearRevenue: Double?
    let averagePerJob: Double?
    let jobCount: Int?
    let outstandingAmount: Double?
}

nonisolated struct CreateClientRequest: Encodable, Sendable {
    let name: String
    var email: String?
    var phone: String?
    var notes: String?
    var defaultRate: Double?
}
