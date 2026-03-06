import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let emailVerified: Bool
    let image: String?
    let createdAt: String?
    let updatedAt: String?
}

struct AuthSession: Codable {
    let token: String
}

struct SignInResponse: Codable {
    let user: User
    let session: AuthSession
}

struct SignInRequest: Encodable {
    let email: String
    let password: String
}

struct SignUpRequest: Encodable {
    let email: String
    let password: String
    let name: String
}
