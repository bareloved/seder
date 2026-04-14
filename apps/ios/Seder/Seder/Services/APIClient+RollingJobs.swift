import Foundation

extension APIClient {
    func listRollingJobs() async throws -> [RollingJob] {
        return try await request(endpoint: "/api/v1/rolling-jobs", method: "GET")
    }

    func createRollingJob(_ input: CreateRollingJobInput) async throws -> RollingJob {
        return try await request(endpoint: "/api/v1/rolling-jobs", method: "POST", body: input)
    }

    func updateRollingJob(id: String, _ input: UpdateRollingJobInput) async throws -> RollingJob {
        return try await request(endpoint: "/api/v1/rolling-jobs/\(id)", method: "PATCH", body: input)
    }

    private struct DeleteRollingJobInput: Codable {
        let deleteFutureDrafts: Bool
    }

    func deleteRollingJob(id: String, deleteFutureDrafts: Bool) async throws {
        let _: EmptyData = try await request(
            endpoint: "/api/v1/rolling-jobs/\(id)",
            method: "DELETE",
            body: DeleteRollingJobInput(deleteFutureDrafts: deleteFutureDrafts)
        )
    }

    func pauseRollingJob(id: String) async throws -> RollingJob {
        return try await request(endpoint: "/api/v1/rolling-jobs/\(id)/pause", method: "POST")
    }

    func resumeRollingJob(id: String) async throws -> RollingJob {
        return try await request(endpoint: "/api/v1/rolling-jobs/\(id)/resume", method: "POST")
    }
}
