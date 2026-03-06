import Foundation

nonisolated struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let name: String
    let emailVerified: Bool
    let image: String?
    let createdAt: String?
    let updatedAt: String?
}

nonisolated struct AuthSession: Codable, Sendable {
    let id: String?
    let token: String
    let userId: String?
    let expiresAt: String?
}

nonisolated struct SignInResponse: Codable, Sendable {
    let user: User
    let session: AuthSession
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
