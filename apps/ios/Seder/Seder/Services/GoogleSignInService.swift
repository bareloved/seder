import Foundation
import GoogleSignIn

@MainActor
class GoogleSignInService {
    static let shared = GoogleSignInService()

    // The server (web) client ID is used as serverClientID so the ID token
    // audience matches what Better Auth expects on the backend.
    private let iosClientID = "272605104614-vg11q50l666ji06an4t1khfr94duumr5.apps.googleusercontent.com"
    private let serverClientID = "272605104614-v4dea68n9613hi6ofbfla2u2dnj8gt2i.apps.googleusercontent.com"

    private init() {}

    func configure() {
        // No additional config needed — clientID is passed per sign-in call
    }

    /// Presents the Google Sign-In UI and returns the ID token on success.
    func signIn() async throws -> String {
        guard let presentingVC = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow })?
            .rootViewController else {
            throw GoogleSignInError.noPresentingViewController
        }

        let config = GIDConfiguration(clientID: iosClientID, serverClientID: serverClientID)
        GIDSignIn.sharedInstance.configuration = config

        let result = try await GIDSignIn.sharedInstance.signIn(
            withPresenting: presentingVC,
            hint: nil,
            additionalScopes: ["https://www.googleapis.com/auth/calendar.readonly"]
        )

        guard let idToken = result.user.idToken?.tokenString else {
            throw GoogleSignInError.missingIDToken
        }

        return idToken
    }

    /// Handles the Google Sign-In redirect URL callback.
    func handle(_ url: URL) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }
}

enum GoogleSignInError: LocalizedError {
    case noPresentingViewController
    case missingIDToken

    var errorDescription: String? {
        switch self {
        case .noPresentingViewController:
            return "לא ניתן להציג את חלון ההתחברות"
        case .missingIDToken:
            return "לא התקבל טוקן מ-Google"
        }
    }
}
