import Combine
import Foundation

enum ClientSortOption: String, CaseIterable {
    case name, revenue, jobs, outstanding

    var label: String {
        switch self {
        case .name: return "שם"
        case .revenue: return "הכנסות"
        case .jobs: return "עבודות"
        case .outstanding: return "חוב"
        }
    }
}

@MainActor
class ClientsViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchQuery = ""
    @Published var sortOption: ClientSortOption = .name
    @Published var sortAscending = true
    @Published var clientEntries: [IncomeEntry] = []
    @Published var isLoadingEntries = false

    private let api = APIClient.shared

    var filteredClients: [Client] {
        var result = clients

        // Search
        if !searchQuery.isEmpty {
            let q = searchQuery.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(q) ||
                ($0.email?.lowercased().contains(q) ?? false) ||
                ($0.phone?.contains(q) ?? false)
            }
        }

        // Sort
        result.sort { a, b in
            let cmp: Bool
            switch sortOption {
            case .name:
                cmp = a.name.localizedCompare(b.name) == .orderedAscending
            case .revenue:
                cmp = (a.thisYearRevenue ?? 0) < (b.thisYearRevenue ?? 0)
            case .jobs:
                cmp = (a.jobCount ?? 0) < (b.jobCount ?? 0)
            case .outstanding:
                cmp = (a.outstandingAmount ?? 0) < (b.outstandingAmount ?? 0)
            }
            return sortAscending ? cmp : !cmp
        }

        return result
    }

    func loadClientEntries(clientId: String) async {
        isLoadingEntries = true
        defer { isLoadingEntries = false }

        do {
            clientEntries = try await api.request(
                endpoint: "/api/v1/income",
                queryItems: [URLQueryItem(name: "clientId", value: clientId)]
            )
        } catch {
            print("[CLIENTS] Failed to load entries for \(clientId): \(error)")
            clientEntries = []
        }
    }

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
