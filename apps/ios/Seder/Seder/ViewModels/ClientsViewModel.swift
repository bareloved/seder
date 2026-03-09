import Combine
import Foundation

@MainActor
class ClientsViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadClients() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Try with analytics first
            let all: [Client] = try await api.request(
                endpoint: "/api/v1/clients",
                queryItems: [URLQueryItem(name: "analytics", value: "true")]
            )
            clients = all.filter { !$0.isArchived }
        } catch {
            print("[CLIENTS] Analytics failed: \(error)")
            // Fallback: load without analytics
            do {
                let all: [Client] = try await api.request(endpoint: "/api/v1/clients")
                clients = all.filter { !$0.isArchived }
            } catch {
                print("[CLIENTS] Fallback also failed: \(error)")
                errorMessage = "שגיאה בטעינת לקוחות"
            }
        }
    }

    func createClient(_ request: CreateClientRequest) async -> Bool {
        do {
            let client: Client = try await api.request(
                endpoint: "/api/v1/clients",
                method: "POST",
                body: request
            )
            clients.insert(client, at: 0)
            return true
        } catch {
            errorMessage = "שגיאה ביצירת לקוח"
            return false
        }
    }

    func updateClient(_ id: String, name: String, email: String?, phone: String?, notes: String?, defaultRate: Double?) async -> Bool {
        do {
            let updated: Client = try await api.request(
                endpoint: "/api/v1/clients/\(id)",
                method: "PUT",
                body: UpdateClientRequest(name: name, email: email, phone: phone, notes: notes, defaultRate: defaultRate)
            )
            if let idx = clients.firstIndex(where: { $0.id == id }) {
                clients[idx] = updated
            }
            return true
        } catch {
            errorMessage = "שגיאה בעדכון לקוח"
            return false
        }
    }

    func archiveClient(_ id: String) async -> Bool {
        do {
            let _: Client = try await api.request(
                endpoint: "/api/v1/clients/\(id)",
                method: "PUT",
                body: UpdateClientRequest(action: "archive")
            )
            clients.removeAll { $0.id == id }
            return true
        } catch {
            errorMessage = "שגיאה במחיקת לקוח"
            return false
        }
    }
}
