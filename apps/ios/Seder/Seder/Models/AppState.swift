import SwiftUI

@MainActor
class AppState: ObservableObject {
    @Published var selectedTab: Int = 0
    @Published var deepLinkEntryId: String?

    func navigateToEntry(id: String) {
        deepLinkEntryId = id
        selectedTab = 0 // Income tab
    }

    func clearDeepLink() {
        deepLinkEntryId = nil
    }
}
