import Combine
import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var user: User?
    @Published var errorMessage: String?

    private let api = APIClient.shared

    init() {
        isAuthenticated = api.isAuthenticated
        if isAuthenticated {
            isLoading = true
            Task { await fetchUser() }
        } else {
            isLoading = false
        }
    }

    private struct SessionResponse: Codable {
        let session: AuthSession?
        let user: User?
    }

    func fetchUser() async {
        defer { isLoading = false }
        do {
            let response: SessionResponse = try await api.directRequest(endpoint: "/api/auth/get-session")
            user = response.user
            isAuthenticated = response.user != nil
        } catch {
            // Token might be expired — clear auth state
            api.token = nil
            isAuthenticated = false
        }
    }

    func signIn(email: String, password: String) async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let response: SignInResponse = try await api.directRequest(
                endpoint: "/api/auth/sign-in/email",
                method: "POST",
                body: SignInRequest(email: email, password: password)
            )
            // Better Auth may return token at top level or inside session
            let token = response.session?.token ?? response.token
            guard let token else {
                errorMessage = "לא התקבל טוקן מהשרת"
                return
            }
            api.token = token
            user = response.user
            isAuthenticated = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בהתחברות"
        }
    }

    func signUp(name: String, email: String, password: String) async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let response: SignInResponse = try await api.directRequest(
                endpoint: "/api/auth/sign-up/email",
                method: "POST",
                body: SignUpRequest(email: email, password: password, name: name)
            )
            let token = response.session?.token ?? response.token
            guard let token else {
                errorMessage = "לא התקבל טוקן מהשרת"
                return
            }
            api.token = token
            user = response.user
            isAuthenticated = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בהרשמה"
        }
    }

    func signOut() {
        api.token = nil
        user = nil
        isAuthenticated = false
    }
}
