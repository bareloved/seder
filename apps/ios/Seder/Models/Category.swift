import Foundation

struct Category: Codable, Identifiable {
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

struct CreateCategoryRequest: Encodable {
    let name: String
    let color: String
    let icon: String
}

struct ReorderItem: Encodable {
    let id: String
    let displayOrder: Int
}
