import Foundation
import SwiftUI

@MainActor
class NudgeViewModel: ObservableObject {
    @Published var nudges: [Nudge] = []
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    func fetchNudges() async {
        isLoading = true
        defer { isLoading = false }

        do {
            nudges = try await apiClient.fetchNudges()
        } catch {
            print("Failed to fetch nudges: \(error)")
            nudges = []
        }
    }

    func dismiss(_ nudge: Nudge) {
        withAnimation {
            nudges.removeAll { $0.id == nudge.id }
        }
        Task {
            try? await apiClient.dismissNudge(
                nudge.nudgeType,
                entryId: nudge.entryId,
                periodKey: nudge.periodKey
            )
        }
    }

    func snooze(_ nudge: Nudge) {
        withAnimation {
            nudges.removeAll { $0.id == nudge.id }
        }
        Task {
            try? await apiClient.dismissNudge(
                nudge.nudgeType,
                entryId: nudge.entryId,
                periodKey: nudge.periodKey,
                snooze: true
            )
        }
    }
}
