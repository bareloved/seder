import CoreText
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Force RTL at the UIKit level so ALL views are RTL
        UIView.appearance().semanticContentAttribute = .forceRightToLeft

        // Register Ploni fonts at runtime
        let fontNames = [
            "ploni-regular-aaa",
            "ploni-medium-aaa",
            "ploni-demibold-aaa",
            "ploni-bold-aaa"
        ]
        for name in fontNames {
            if let url = Bundle.main.url(forResource: name, withExtension: "otf") {
                CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            }
        }

        return true
    }

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
            Group {
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
            .tint(SederTheme.brandGreen)
        }
    }
}
