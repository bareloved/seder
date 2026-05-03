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
    /// True when the authenticated user has not accepted the current TERMS_VERSION.
    /// Drives the non-dismissable ConsentSheet in SederApp.
    @Published var needsConsent = false

    /// Captured during sign-up before the account exists. Submitted to
    /// /api/v1/me/consent immediately after signUp/signInWithGoogle succeeds,
    /// so the legal record is tied to the same moment as account creation.
    private var pendingMarketingOptIn: Bool? = nil

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

    /// Set before calling signUp / signInWithGoogle so consent is recorded for
    /// the new account at creation time.
    func stagePendingConsent(marketingOptIn: Bool) {
        pendingMarketingOptIn = marketingOptIn
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
            await loadAvatarImage()
            await refreshConsentStatus()
        } catch {
            // Token might be expired — clear auth state
            api.token = nil
            isAuthenticated = false
        }
    }

    /// GETs /api/v1/me/consent-status and updates needsConsent. Called on every
    /// auth state transition so existing users (and OAuth new users) hit the
    /// gate immediately after sign-in.
    func refreshConsentStatus() async {
        do {
            let status: ConsentStatus = try await api.request(endpoint: "/api/v1/me/consent-status")
            needsConsent = !status.termsAccepted
        } catch {
            // On failure, fail-open (don't block the user). The web middleware
            // gate is the ground truth; this is a UX nicety.
            needsConsent = false
        }
    }

    /// Submits consent for the authenticated user. Called from ConsentSheet
    /// (post-auth gate) and folded in automatically after signUp /
    /// signInWithGoogle when stagePendingConsent was called first.
    func submitConsent(marketingOptIn: Bool, source: String = "consent_banner") async -> Bool {
        do {
            let body = SubmitConsentBody(
                termsAccepted: true,
                marketingOptIn: marketingOptIn,
                source: source
            )
            let _: ConsentStatus = try await api.request(
                endpoint: "/api/v1/me/consent",
                method: "POST",
                body: body
            )
            needsConsent = false
            return true
        } catch {
            return false
        }
    }

    private func submitPendingConsentIfAny(source: String) async {
        guard let marketingOptIn = pendingMarketingOptIn else { return }
        pendingMarketingOptIn = nil
        _ = await submitConsent(marketingOptIn: marketingOptIn, source: source)
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
            NotificationService.shared.registerCachedTokenIfAvailable()
            await loadAvatarImage()
            await refreshConsentStatus()
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
            NotificationService.shared.registerCachedTokenIfAvailable()
            await loadAvatarImage()
            // Sign-up specifically: drain the pending consent the user ticked
            // on the form into the legal record. If nothing was staged (e.g.
            // future code paths bypass the form) the consent gate catches it.
            await submitPendingConsentIfAny(source: "signup_email")
            await refreshConsentStatus()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בהרשמה"
        }
    }

    func signInWithGoogle() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let idToken = try await GoogleSignInService.shared.signIn()
            let response: SignInResponse = try await api.directRequest(
                endpoint: "/api/auth/sign-in/social",
                method: "POST",
                body: GoogleSignInRequest(idToken: idToken)
            )
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
            NotificationService.shared.registerCachedTokenIfAvailable()
            await loadAvatarImage()
            // For new sign-ups via Google, the SignUpView stages pending consent
            // before calling this. Returning users have no staged consent — they
            // pass through and the consent gate handles them if their account
            // pre-dates the consent log.
            await submitPendingConsentIfAny(source: "signup_google")
            await refreshConsentStatus()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch let error as NSError where error.domain == "com.google.GIDSignIn" && error.code == -5 {
            // User cancelled — not an error, just dismiss silently
        } catch {
            errorMessage = "שגיאה בהתחברות עם Google"
        }
    }

    func signOut() async {
        // Unregister this device's APNs token *before* dropping the auth header,
        // so the request authenticates as the outgoing user.
        await NotificationService.shared.unregisterCachedToken()
        api.token = nil
        user = nil
        avatarImage = nil
        isAuthenticated = false
        SentryService.clearUser()
    }

    private func loadAvatarImage() async {
        guard let urlString = user?.image, let url = URL(string: urlString) else {
            avatarImage = nil
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            avatarImage = UIImage(data: data)
        } catch {
            avatarImage = nil
        }
    }
}
