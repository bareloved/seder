import Foundation
// import Sentry  // Uncomment after adding Sentry SPM package in Xcode

/// Sentry crash reporting service.
/// Setup: In Xcode, File > Add Package Dependencies > https://github.com/getsentry/sentry-cocoa
/// Select the "Sentry" product. Then uncomment the `import Sentry` above and the method bodies below.
enum SentryService {
    static func start() {
        // SentrySDK.start { options in
        //     options.dsn = "YOUR_SENTRY_DSN_HERE"
        //     options.tracesSampleRate = 1.0
        //     options.environment = "production"
        //     options.enableCaptureFailedRequests = true
        // }
    }

    static func setUser(id: String) {
        // let user = Sentry.User()
        // user.userId = id
        // SentrySDK.setUser(user)
    }

    static func clearUser() {
        // SentrySDK.setUser(nil)
    }
}
