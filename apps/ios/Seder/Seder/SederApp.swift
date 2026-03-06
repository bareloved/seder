import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationService.shared.registerToken(deviceToken)
    }
}

@main
struct SederApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environment(\.layoutDirection, .rightToLeft)
                    .onAppear {
                        NotificationService.shared.requestPermission()
                    }
            } else if authViewModel.isLoading {
                LoadingView()
            } else {
                SignInView()
                    .environmentObject(authViewModel)
                    .environment(\.layoutDirection, .rightToLeft)
            }
        }
    }
}
