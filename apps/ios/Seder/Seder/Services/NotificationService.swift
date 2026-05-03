import Foundation
import UserNotifications
import UIKit

class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    private(set) var lastDeviceToken: String?

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
        lastDeviceToken = token
        Task { await postToken(token) }
    }

    /// Re-POST the cached APNs token under the currently authenticated user.
    /// APNs may not redeliver the token to `didRegisterForRemoteNotifications`
    /// after an in-session user switch, so we explicitly re-claim it.
    func registerCachedTokenIfAvailable() {
        guard let token = lastDeviceToken else { return }
        Task { await postToken(token) }
    }

    /// Best-effort unregister of the current device's token before sign-out,
    /// so the previous user stops receiving pushes on this device.
    /// Must be called *before* clearing the API token so the auth header is sent.
    func unregisterCachedToken() async {
        guard let token = lastDeviceToken else { return }
        do {
            let _: EmptyData = try await APIClient.shared.request(
                endpoint: "/api/v1/devices/\(token)",
                method: "DELETE"
            )
        } catch {
            print("Failed to unregister push token: \(error)")
        }
    }

    private func postToken(_ token: String) async {
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
