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
            clients = try await api.request(
                endpoint: "/api/v1/clients",
                queryItems: [URLQueryItem(name: "analytics", value: "true")]
            )
        } catch {
            errorMessage = "שגיאה בטעינת לקוחות"
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
}
