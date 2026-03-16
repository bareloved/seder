import Foundation
import Sentry

/// Sentry crash reporting service.
enum SentryService {
    static func start() {
        SentrySDK.start { options in
            options.dsn = "https://5f9b5779bd0f7dfdff1210779bcd69bd@o4511050703175680.ingest.de.sentry.io/4511053992034384"
            options.tracesSampleRate = 1.0
            options.environment = "production"
            options.enableCaptureFailedRequests = true
        }
    }

    static func setUser(id: String) {
        let user = Sentry.User()
        user.userId = id
        SentrySDK.setUser(user)
    }

    static func clearUser() {
        SentrySDK.setUser(nil)
    }
}
