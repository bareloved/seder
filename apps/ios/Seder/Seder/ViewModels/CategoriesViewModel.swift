import Combine
import Foundation

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
