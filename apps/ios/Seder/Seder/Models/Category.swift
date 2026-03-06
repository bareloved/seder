import Foundation

nonisolated struct Category: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let color: String
    let icon: String
    let displayOrder: String?
    let isArchived: Bool
    let createdAt: String?
    let updatedAt: String?

    var order: Int { Int(displayOrder ?? "0") ?? 0 }
}

nonisolated struct CreateCategoryRequest: Encodable, Sendable {
    let name: String
    let color: String
    let icon: String
}

nonisolated struct ReorderItem: Encodable, Sendable {
    let id: String
    let displayOrder: Int
}
