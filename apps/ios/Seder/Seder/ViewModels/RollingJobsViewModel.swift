import Foundation
import Combine

@MainActor
final class RollingJobsViewModel: ObservableObject {
    @Published var jobs: [RollingJob] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            jobs = try await api.listRollingJobs()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func create(_ input: CreateRollingJobInput) async -> Bool {
        do {
            let created = try await api.createRollingJob(input)
            jobs.append(created)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func update(id: String, _ input: UpdateRollingJobInput) async -> Bool {
        do {
            let updated = try await api.updateRollingJob(id: id, input)
            if let idx = jobs.firstIndex(where: { $0.id == id }) {
                jobs[idx] = updated
            }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func delete(id: String, deleteFutureDrafts: Bool) async -> Bool {
        do {
            try await api.deleteRollingJob(id: id, deleteFutureDrafts: deleteFutureDrafts)
            jobs.removeAll { $0.id == id }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func togglePause(_ job: RollingJob) async {
        do {
            let updated = job.isActive
                ? try await api.pauseRollingJob(id: job.id)
                : try await api.resumeRollingJob(id: job.id)
            if let idx = jobs.firstIndex(where: { $0.id == job.id }) {
                jobs[idx] = updated
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
