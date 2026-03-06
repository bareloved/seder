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
        // Check for existing token on launch
        isAuthenticated = api.isAuthenticated
        isLoading = false
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
            api.token = response.session.token
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
            api.token = response.session.token
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
