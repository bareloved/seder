import Combine
import Foundation
import SwiftUI

@MainActor
class CategoriesViewModel: ObservableObject {
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadCategories() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let all: [Category] = try await api.request(endpoint: "/api/v1/categories")
            categories = all.filter { !$0.isArchived }.sorted { $0.order < $1.order }
        } catch {
            errorMessage = "שגיאה בטעינת קטגוריות"
        }
    }

    func createCategory(_ request: CreateCategoryRequest) async -> Bool {
        do {
            let cat: Category = try await api.request(
                endpoint: "/api/v1/categories",
                method: "POST",
                body: request
            )
            categories.append(cat)
            return true
        } catch {
            errorMessage = "שגיאה ביצירת קטגוריה"
            return false
        }
    }

    func updateCategory(_ id: String, name: String, color: String, icon: String) async -> Bool {
        do {
            let updated: Category = try await api.request(
                endpoint: "/api/v1/categories/\(id)",
                method: "PUT",
                body: UpdateCategoryRequest(name: name, color: color, icon: icon)
            )
            if let idx = categories.firstIndex(where: { $0.id == id }) {
                categories[idx] = updated
            }
            return true
        } catch {
            errorMessage = "שגיאה בעדכון קטגוריה"
            return false
        }
    }

    func archiveCategory(_ id: String) async -> Bool {
        do {
            let _: Category = try await api.request(
                endpoint: "/api/v1/categories/\(id)",
                method: "PUT",
                body: UpdateCategoryRequest(action: "archive")
            )
            categories.removeAll { $0.id == id }
            return true
        } catch {
            errorMessage = "שגיאה במחיקת קטגוריה"
            return false
        }
    }

    func moveCategory(from source: IndexSet, to destination: Int) {
        categories.move(fromOffsets: source, toOffset: destination)
        Task { await saveOrder() }
    }

    private func saveOrder() async {
        let items = categories.enumerated().map { ReorderItem(id: $1.id, displayOrder: $0) }
        do {
            let _: [String: Bool] = try await api.request(
                endpoint: "/api/v1/categories/reorder",
                method: "POST",
                body: items
            )
        } catch {
            errorMessage = "שגיאה בשמירת סדר"
        }
    }
}
