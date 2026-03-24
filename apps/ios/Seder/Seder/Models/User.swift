import Foundation

nonisolated struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let name: String?
    let emailVerified: Bool?
    let image: String?
    let createdAt: String?
    let updatedAt: String?

    var displayName: String { name ?? email }
}

nonisolated struct AuthSession: Codable, Sendable {
    let id: String?
    let token: String
    let userId: String?
    let expiresAt: String?
    let ipAddress: String?
    let userAgent: String?
}

nonisolated struct SignInResponse: Codable, Sendable {
    let user: User?
    let session: AuthSession?
    let token: String?
}

nonisolated struct SignInRequest: Encodable, Sendable {
    let email: String
    let password: String
}

nonisolated struct SignUpRequest: Encodable, Sendable {
    let email: String
    let password: String
    let name: String
}

nonisolated struct GoogleSignInRequest: Encodable, Sendable {
    let provider: String
    let idToken: IDTokenPayload
    let callbackURL: String

    init(idToken: String) {
        self.provider = "google"
        self.idToken = IDTokenPayload(token: idToken)
        self.callbackURL = "/dashboard"
    }
}

nonisolated struct IDTokenPayload: Encodable, Sendable {
    let token: String
}
