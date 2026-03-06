import SwiftUI

@main
struct SederApp: App {
    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
