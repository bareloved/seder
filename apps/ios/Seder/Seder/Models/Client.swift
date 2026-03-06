import Foundation

struct Client: Codable, Identifiable {
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

struct CreateClientRequest: Encodable {
    let name: String
    var email: String?
    var phone: String?
    var notes: String?
    var defaultRate: Double?
}
