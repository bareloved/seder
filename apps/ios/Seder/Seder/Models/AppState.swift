import Combine
import SwiftUI

@MainActor
class AppState: ObservableObject {
    @Published var selectedTab: Int = 0
    @Published var deepLinkEntryId: String?
    @Published var navigateToMonth: Date?

    func navigateToEntry(id: String) {
        deepLinkEntryId = id
        selectedTab = 0 // Income tab
    }

    func navigateToIncomeMonth(month: Int, year: Int) {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        if let date = Calendar.current.date(from: components) {
            navigateToMonth = date
            selectedTab = 0 // Income tab
        }
    }

    func clearDeepLink() {
        deepLinkEntryId = nil
    }

    func clearMonthNavigation() {
        navigateToMonth = nil
    }
}
