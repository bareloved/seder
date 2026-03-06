import Foundation
import UserNotifications
import UIKit

class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    func registerToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        Task {
            struct RegisterRequest: Encodable {
                let token: String
                let platform: String
            }
            do {
                let _: EmptyData = try await APIClient.shared.request(
                    endpoint: "/api/v1/devices",
                    method: "POST",
                    body: RegisterRequest(token: token, platform: "ios")
                )
            } catch {
                print("Failed to register push token: \(error)")
            }
        }
    }
}
