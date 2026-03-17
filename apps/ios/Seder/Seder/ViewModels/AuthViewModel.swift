import Combine
import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var user: User?
    @Published var errorMessage: String?
    @Published var avatarImage: UIImage?

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
            if let user = response.user {
                SentryService.setUser(id: user.id)
            }
            loadAvatarImage()
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
            if let user = response.user {
                SentryService.setUser(id: user.id)
            }
            loadAvatarImage()
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
            loadAvatarImage()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בהרשמה"
        }
    }

    func signOut() {
        api.token = nil
        user = nil
        avatarImage = nil
        isAuthenticated = false
        SentryService.clearUser()
    }

    private func loadAvatarImage() {
        guard let urlString = user?.image, let url = URL(string: urlString) else {
            avatarImage = nil
            return
        }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data, let uiImage = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                self?.avatarImage = uiImage
            }
        }.resume()
    }
}
