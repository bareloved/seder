# Native Swift iOS App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a native Swift/SwiftUI iOS app that replaces the existing Expo/React Native app, providing the full web app feature set via the existing REST API.

**Architecture:** SwiftUI app with MVVM pattern. APIClient handles all HTTP communication with `https://sedder.app/api/v1/*`. Auth tokens stored in iOS Keychain. Zero third-party dependencies.

**Tech Stack:** Swift 5.9+, SwiftUI, iOS 16+, Swift Charts, URLSession async/await, Keychain Services

---

## Task 0: Delete Existing Expo App

**Files:**
- Delete: `apps/mobile/` (entire directory)

**Step 1: Remove the Expo/React Native app**

```bash
rm -rf apps/mobile
```

**Step 2: Clean up root package.json references**

Remove any mobile-specific scripts from the root `package.json` (e.g., `dev:mobile`).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Expo/React Native mobile app"
```

---

## Task 1: Xcode Project Setup

**Files:**
- Create: `apps/ios/Seder.xcodeproj`
- Create: `apps/ios/Seder/SederApp.swift`
- Create: `apps/ios/Seder/Info.plist`
- Create: `apps/ios/Seder/Assets.xcassets`

**Step 1: Create the Xcode project**

Open Xcode → File → New → Project → iOS → App
- Product Name: `Seder`
- Team: Personal Team (free account)
- Organization Identifier: `com.bareloved`
- Bundle Identifier: `com.bareloved.seder`
- Interface: SwiftUI
- Language: Swift
- Storage: None
- Save to: `apps/ios/`

**Step 2: Configure project settings**

In Xcode project settings:
- Deployment Target: iOS 16.0
- Device Orientation: Portrait only
- Supported Destinations: iPhone only
- Development Language: Hebrew
- Add Hebrew localization: Project → Info → Localizations → + Hebrew

**Step 3: Set up app entry point**

Replace `SederApp.swift` with:

```swift
import SwiftUI

@main
struct SederApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environment(\.layoutDirection, .rightToLeft)
            } else if authViewModel.isLoading {
                LoadingView()
            } else {
                SignInView()
                    .environmentObject(authViewModel)
                    .environment(\.layoutDirection, .rightToLeft)
            }
        }
    }
}
```

**Step 4: Create placeholder views**

Create `Views/LoadingView.swift`:
```swift
import SwiftUI

struct LoadingView: View {
    var body: some View {
        ProgressView()
    }
}
```

Create `Views/MainTabView.swift`:
```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            Text("הכנסות")
                .tabItem {
                    Label("הכנסות", systemImage: "banknote")
                }
            Text("אנליטיקס")
                .tabItem {
                    Label("אנליטיקס", systemImage: "chart.bar")
                }
            Text("לקוחות")
                .tabItem {
                    Label("לקוחות", systemImage: "person.2")
                }
            Text("הוצאות")
                .tabItem {
                    Label("הוצאות", systemImage: "creditcard")
                }
        }
    }
}
```

**Step 5: Build and run on simulator**

Run: Cmd+R in Xcode targeting iPhone 16 simulator. Verify the app launches with a tab bar.

**Step 6: Commit**

```bash
cd apps/ios && git add -A && git commit -m "feat(ios): initialize Xcode project with SwiftUI"
```

---

## Task 2: API Client & Keychain Service

**Files:**
- Create: `apps/ios/Seder/Services/KeychainService.swift`
- Create: `apps/ios/Seder/Services/APIClient.swift`
- Create: `apps/ios/Seder/Models/APIResponse.swift`

**Step 1: Create KeychainService**

```swift
import Foundation
import Security

enum KeychainService {
    private static let service = "com.bareloved.seder"

    static func save(key: String, data: Data) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnData as String: true
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else {
            return nil
        }
        return result as? Data
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }

    // Convenience methods for String storage
    static func saveString(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        return save(key: key, data: data)
    }

    static func loadString(key: String) -> String? {
        guard let data = load(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
```

**Step 2: Create API response models**

```swift
import Foundation

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
    let code: String?
}

enum APIError: LocalizedError {
    case unauthorized
    case notFound(String)
    case validation(String)
    case server(String)
    case network(Error)
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "נא להתחבר מחדש"
        case .notFound(let msg): return msg
        case .validation(let msg): return msg
        case .server(let msg): return msg
        case .network(let err): return "שגיאת רשת: \(err.localizedDescription)"
        case .decodingFailed(let err): return "שגיאת נתונים: \(err.localizedDescription)"
        }
    }
}
```

**Step 3: Create APIClient**

```swift
import Foundation

class APIClient {
    static let shared = APIClient()

    #if DEBUG
    private let baseURL = "http://localhost:3001"
    #else
    private let baseURL = "https://sedder.app"
    #endif

    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private let tokenKey = "seder_auth_token"

    var token: String? {
        get { KeychainService.loadString(key: tokenKey) }
        set {
            if let value = newValue {
                _ = KeychainService.saveString(key: tokenKey, value: value)
            } else {
                KeychainService.delete(key: tokenKey)
            }
        }
    }

    var isAuthenticated: Bool { token != nil }

    // MARK: - Generic Request

    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        var components = URLComponents(string: baseURL + endpoint)!
        if let queryItems { components.queryItems = queryItems }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.network(URLError(.badServerResponse))
        }

        switch httpResponse.statusCode {
        case 200, 201:
            do {
                let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)
                if apiResponse.success, let result = apiResponse.data {
                    return result
                }
                throw APIError.server(apiResponse.error ?? "Unknown error")
            } catch let error as APIError {
                throw error
            } catch {
                throw APIError.decodingFailed(error)
            }
        case 401:
            self.token = nil
            throw APIError.unauthorized
        case 404:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.notFound(apiResponse?.error ?? "Not found")
        default:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.server(apiResponse?.error ?? "Server error (\(httpResponse.statusCode))")
        }
    }
}

struct EmptyData: Decodable {}
```

**Step 4: Build to verify compilation**

Run: Cmd+B in Xcode. Should compile with zero errors.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(ios): add APIClient and KeychainService"
```

---

## Task 3: Models

**Files:**
- Create: `apps/ios/Seder/Models/User.swift`
- Create: `apps/ios/Seder/Models/IncomeEntry.swift`
- Create: `apps/ios/Seder/Models/Category.swift`
- Create: `apps/ios/Seder/Models/Client.swift`
- Create: `apps/ios/Seder/Models/Analytics.swift`
- Create: `apps/ios/Seder/Models/Settings.swift`

**Step 1: Create User model**

```swift
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
```

**Step 2: Create IncomeEntry model**

```swift
import Foundation

struct IncomeEntry: Codable, Identifiable {
    let id: String
    let date: String
    let description: String
    let clientName: String
    let clientId: String?
    let amountGross: String // numeric from API
    let amountPaid: String
    let vatRate: String
    let includesVat: Bool
    let invoiceStatus: InvoiceStatus
    let paymentStatus: PaymentStatus
    let categoryId: String?
    let categoryData: CategoryData?
    let notes: String?
    let invoiceSentDate: String?
    let paidDate: String?
    let calendarEventId: String?
    let createdAt: String?
    let updatedAt: String?

    // Computed helpers
    var grossAmount: Double { Double(amountGross) ?? 0 }
    var paidAmount: Double { Double(amountPaid) ?? 0 }
    var vat: Double { Double(vatRate) ?? 18 }
}

enum InvoiceStatus: String, Codable, CaseIterable {
    case draft, sent, paid, cancelled

    var label: String {
        switch self {
        case .draft: return "טיוטה"
        case .sent: return "נשלח"
        case .paid: return "שולם"
        case .cancelled: return "בוטל"
        }
    }
}

enum PaymentStatus: String, Codable, CaseIterable {
    case unpaid, partial, paid

    var label: String {
        switch self {
        case .unpaid: return "לא שולם"
        case .partial: return "שולם חלקית"
        case .paid: return "שולם"
        }
    }
}

struct CategoryData: Codable {
    let id: String
    let name: String
    let color: String
    let icon: String
}

struct CreateIncomeRequest: Encodable {
    let date: String
    let description: String
    var clientName: String = ""
    var clientId: String?
    let amountGross: Double
    var amountPaid: Double = 0
    var vatRate: Double = 18
    var includesVat: Bool = true
    var invoiceStatus: String = "draft"
    var paymentStatus: String = "unpaid"
    var categoryId: String?
    var notes: String?
}

struct UpdateIncomeRequest: Encodable {
    var date: String?
    var description: String?
    var clientName: String?
    var clientId: String?
    var amountGross: Double?
    var amountPaid: Double?
    var vatRate: Double?
    var includesVat: Bool?
    var invoiceStatus: String?
    var paymentStatus: String?
    var categoryId: String?
    var notes: String?
}
```

**Step 3: Create Category model**

```swift
import Foundation

struct Category: Codable, Identifiable {
    let id: String
    let name: String
    let color: String
    let icon: String
    let displayOrder: String?
    let isArchived: Bool
    let createdAt: String?
    let updatedAt: String?

    var order: Int { Int(displayOrder ?? "0") ?? 0 }
}

struct CreateCategoryRequest: Encodable {
    let name: String
    let color: String
    let icon: String
}

struct ReorderItem: Encodable {
    let id: String
    let displayOrder: Int
}
```

**Step 4: Create Client model**

```swift
import Foundation

struct Client: Codable, Identifiable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let notes: String?
    let defaultRate: String?
    let isArchived: Bool
    let createdAt: String?
    let updatedAt: String?

    // Analytics fields (optional, only when ?analytics=true)
    let totalEarned: Double?
    let thisMonthRevenue: Double?
    let thisYearRevenue: Double?
    let averagePerJob: Double?
    let jobCount: Int?
    let outstandingAmount: Double?
}

struct CreateClientRequest: Encodable {
    let name: String
    var email: String?
    var phone: String?
    var notes: String?
    var defaultRate: Double?
}
```

**Step 5: Create Analytics model**

```swift
import Foundation

struct IncomeAggregates: Codable {
    let totalGross: Double
    let totalPaid: Double
    let totalUnpaid: Double
    let vatTotal: Double
    let jobsCount: Int
    let outstanding: Double
    let readyToInvoice: Double
    let readyToInvoiceCount: Int
    let invoicedCount: Int
    let overdueCount: Int
    let previousMonthPaid: Double
    let trend: Double
}

struct MonthTrend: Codable {
    let month: Int
    let status: String // "all-paid" | "has-unpaid" | "empty"
}
```

**Step 6: Create Settings model**

```swift
import Foundation

struct UserSettings: Codable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
}

struct UpdateSettingsRequest: Encodable {
    var theme: String?
    var language: String?
}
```

**Step 7: Build to verify compilation**

Run: Cmd+B. Should compile with zero errors.

**Step 8: Commit**

```bash
git add -A && git commit -m "feat(ios): add data models for all API entities"
```

---

## Task 4: Auth — ViewModel + Sign In Screen

**Files:**
- Create: `apps/ios/Seder/ViewModels/AuthViewModel.swift`
- Create: `apps/ios/Seder/Views/Auth/SignInView.swift`
- Create: `apps/ios/Seder/Views/Auth/SignUpView.swift`

**Step 1: Create AuthViewModel**

```swift
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
            let response: SignInResponse = try await api.request(
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
            let response: SignInResponse = try await api.request(
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
```

**Step 2: Create SignInView**

```swift
import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Logo / Title
                VStack(spacing: 8) {
                    Text("סדר")
                        .font(.system(size: 48, weight: .bold))
                    Text("ניהול הכנסות לפרילנסרים")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Form
                VStack(spacing: 16) {
                    TextField("אימייל", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)

                    SecureField("סיסמה", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
                        .environment(\.layoutDirection, .leftToRight)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await auth.signIn(email: email, password: password) }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("התחברות")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
                }
                .padding(.horizontal, 32)

                Button("אין לך חשבון? הירשם") {
                    showSignUp = true
                }
                .font(.footnote)

                Spacer()
            }
            .sheet(isPresented: $showSignUp) {
                SignUpView()
                    .environmentObject(auth)
            }
        }
    }
}
```

**Step 3: Create SignUpView**

```swift
import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Text("הרשמה")
                    .font(.title.bold())

                VStack(spacing: 16) {
                    TextField("שם מלא", text: $name)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.name)

                    TextField("אימייל", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)

                    SecureField("סיסמה (8 תווים לפחות)", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)
                        .environment(\.layoutDirection, .leftToRight)

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await auth.signUp(name: name, email: email, password: password)
                            if auth.isAuthenticated { dismiss() }
                        }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("הרשמה")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(name.isEmpty || email.isEmpty || password.count < 8 || auth.isLoading)
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
```

**Step 4: Build and run**

Run on simulator. Should show sign-in screen with email/password fields and Hebrew text.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(ios): add auth views and sign-in/sign-up flow"
```

---

## Task 5: Income List View

**Files:**
- Create: `apps/ios/Seder/ViewModels/IncomeViewModel.swift`
- Create: `apps/ios/Seder/Views/Income/IncomeListView.swift`
- Create: `apps/ios/Seder/Views/Income/IncomeEntryRow.swift`
- Create: `apps/ios/Seder/Views/Components/MonthPicker.swift`
- Create: `apps/ios/Seder/Views/Components/CurrencyText.swift`

**Step 1: Create CurrencyText component**

```swift
import SwiftUI

struct CurrencyText: View {
    let amount: Double
    var font: Font = .body
    var color: Color = .primary

    var body: some View {
        Text(formatted)
            .font(font)
            .foregroundStyle(color)
    }

    private var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "ILS"
        formatter.currencySymbol = "₪"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "₪\(Int(amount))"
    }
}
```

**Step 2: Create MonthPicker**

```swift
import SwiftUI

struct MonthPicker: View {
    @Binding var selectedDate: Date

    private let calendar = Calendar.current
    private let hebrewMonths = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ]

    private var monthString: String {
        let month = calendar.component(.month, from: selectedDate)
        let year = calendar.component(.year, from: selectedDate)
        return "\(hebrewMonths[month - 1]) \(year)"
    }

    var body: some View {
        HStack {
            Button {
                selectedDate = calendar.date(byAdding: .month, value: 1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.left")
            }

            Text(monthString)
                .font(.headline)
                .frame(minWidth: 140)

            Button {
                selectedDate = calendar.date(byAdding: .month, value: -1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.right")
            }
        }
    }
}
```

**Step 3: Create IncomeViewModel**

```swift
import Foundation

@MainActor
class IncomeViewModel: ObservableObject {
    @Published var entries: [IncomeEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedMonth = Date()

    private let api = APIClient.shared

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    func loadEntries() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            entries = try await api.request(
                endpoint: "/api/v1/income",
                queryItems: [URLQueryItem(name: "month", value: monthString)]
            )
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בטעינת נתונים"
        }
    }

    func deleteEntry(_ id: String) async {
        do {
            let _: [String: Bool] = try await api.request(
                endpoint: "/api/v1/income/\(id)",
                method: "DELETE"
            )
            entries.removeAll { $0.id == id }
        } catch {
            errorMessage = "שגיאה במחיקה"
        }
    }

    func createEntry(_ request: CreateIncomeRequest) async -> Bool {
        do {
            let entry: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income",
                method: "POST",
                body: request
            )
            entries.insert(entry, at: 0)
            return true
        } catch let error as APIError {
            errorMessage = error.errorDescription
            return false
        } catch {
            errorMessage = "שגיאה ביצירת רשומה"
            return false
        }
    }

    func updateEntry(_ id: String, _ request: UpdateIncomeRequest) async -> Bool {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)",
                method: "PUT",
                body: request
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
            return true
        } catch let error as APIError {
            errorMessage = error.errorDescription
            return false
        } catch {
            errorMessage = "שגיאה בעדכון"
            return false
        }
    }

    func markSent(_ id: String) async {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)/mark-sent",
                method: "POST"
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
        } catch {
            errorMessage = "שגיאה בעדכון סטטוס"
        }
    }

    func markPaid(_ id: String) async {
        do {
            let updated: IncomeEntry = try await api.request(
                endpoint: "/api/v1/income/\(id)/mark-paid",
                method: "POST"
            )
            if let index = entries.firstIndex(where: { $0.id == id }) {
                entries[index] = updated
            }
        } catch {
            errorMessage = "שגיאה בעדכון סטטוס"
        }
    }
}
```

**Step 4: Create IncomeEntryRow**

```swift
import SwiftUI

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var onMarkSent: (() -> Void)?
    var onMarkPaid: (() -> Void)?

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // Top row: description + amount
            HStack {
                CurrencyText(amount: entry.grossAmount, font: .headline)
                Spacer()
                Text(entry.description)
                    .font(.headline)
                    .lineLimit(1)
            }

            // Middle row: client + date
            HStack {
                Text(entry.date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                if !entry.clientName.isEmpty {
                    Text(entry.clientName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Bottom row: status badges
            HStack(spacing: 8) {
                Spacer()
                StatusBadge(
                    text: entry.invoiceStatus.label,
                    color: invoiceStatusColor
                )
                StatusBadge(
                    text: entry.paymentStatus.label,
                    color: paymentStatusColor
                )
                if let cat = entry.categoryData {
                    Text(cat.name)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.accentColor.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 4)
        .swipeActions(edge: .leading) {
            if entry.invoiceStatus == .draft {
                Button("נשלח") { onMarkSent?() }
                    .tint(.blue)
            }
            if entry.paymentStatus != .paid {
                Button("שולם") { onMarkPaid?() }
                    .tint(.green)
            }
        }
    }

    private var invoiceStatusColor: Color {
        switch entry.invoiceStatus {
        case .draft: return .gray
        case .sent: return .blue
        case .paid: return .green
        case .cancelled: return .red
        }
    }

    private var paymentStatusColor: Color {
        switch entry.paymentStatus {
        case .unpaid: return .red
        case .partial: return .orange
        case .paid: return .green
        }
    }
}

struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
```

**Step 5: Create IncomeListView**

```swift
import SwiftUI

struct IncomeListView: View {
    @StateObject private var viewModel = IncomeViewModel()
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddSheet = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Month picker
                MonthPicker(selectedDate: $viewModel.selectedMonth)
                    .padding()

                // Summary bar
                HStack {
                    VStack(alignment: .center) {
                        Text("סה״כ")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        CurrencyText(
                            amount: viewModel.entries.reduce(0) { $0 + $1.grossAmount },
                            font: .headline
                        )
                    }
                    Spacer()
                    Text("\(viewModel.entries.count) רשומות")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)
                .padding(.bottom, 8)

                Divider()

                // List
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if viewModel.entries.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("אין רשומות החודש")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(viewModel.entries) { entry in
                            IncomeEntryRow(
                                entry: entry,
                                onMarkSent: {
                                    Task { await viewModel.markSent(entry.id) }
                                },
                                onMarkPaid: {
                                    Task { await viewModel.markPaid(entry.id) }
                                }
                            )
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                let entry = viewModel.entries[index]
                                Task { await viewModel.deleteEntry(entry.id) }
                            }
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.loadEntries()
                    }
                }
            }
            .navigationTitle("הכנסות")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                IncomeFormSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environmentObject(auth)
            }
            .task { await viewModel.loadEntries() }
            .onChange(of: viewModel.selectedMonth) {
                Task { await viewModel.loadEntries() }
            }
        }
    }
}
```

**Step 6: Build and verify**

Run: Cmd+B. Fix any compilation errors.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(ios): add income list view with month picker and swipe actions"
```

---

## Task 6: Income Form (Add/Edit)

**Files:**
- Create: `apps/ios/Seder/Views/Income/IncomeFormSheet.swift`

**Step 1: Create the form**

```swift
import SwiftUI

struct IncomeFormSheet: View {
    @ObservedObject var viewModel: IncomeViewModel
    @Environment(\.dismiss) var dismiss

    var editingEntry: IncomeEntry?

    @State private var date = Date()
    @State private var description = ""
    @State private var clientName = ""
    @State private var amountGross = ""
    @State private var amountPaid = ""
    @State private var vatRate = "18"
    @State private var includesVat = true
    @State private var invoiceStatus: InvoiceStatus = .draft
    @State private var paymentStatus: PaymentStatus = .unpaid
    @State private var notes = ""
    @State private var isSaving = false

    private var isEditing: Bool { editingEntry != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("פרטי הכנסה") {
                    DatePicker("תאריך", selection: $date, displayedComponents: .date)
                        .environment(\.calendar, Calendar(identifier: .gregorian))

                    TextField("תיאור", text: $description)

                    TextField("שם לקוח", text: $clientName)

                    HStack {
                        TextField("סכום ברוטו", text: $amountGross)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("₪")
                    }

                    HStack {
                        TextField("סכום ששולם", text: $amountPaid)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("₪")
                    }
                }

                Section("מע״מ") {
                    HStack {
                        TextField("אחוז מע״מ", text: $vatRate)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("%")
                    }
                    Toggle("כולל מע״מ", isOn: $includesVat)
                }

                Section("סטטוס") {
                    Picker("סטטוס חשבונית", selection: $invoiceStatus) {
                        ForEach(InvoiceStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status)
                        }
                    }

                    Picker("סטטוס תשלום", selection: $paymentStatus) {
                        ForEach(PaymentStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status)
                        }
                    }
                }

                Section("הערות") {
                    TextField("הערות", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(isEditing ? "עריכת הכנסה" : "הכנסה חדשה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "עדכון" : "שמירה") {
                        Task { await save() }
                    }
                    .disabled(description.isEmpty || amountGross.isEmpty || isSaving)
                }
            }
            .onAppear { populateFromEntry() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func populateFromEntry() {
        guard let entry = editingEntry else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let d = formatter.date(from: entry.date) { date = d }
        description = entry.description
        clientName = entry.clientName
        amountGross = entry.amountGross
        amountPaid = entry.amountPaid
        vatRate = entry.vatRate
        includesVat = entry.includesVat
        invoiceStatus = entry.invoiceStatus
        paymentStatus = entry.paymentStatus
        notes = entry.notes ?? ""
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: date)

        if let entry = editingEntry {
            let request = UpdateIncomeRequest(
                date: dateStr,
                description: description,
                clientName: clientName,
                amountGross: Double(amountGross),
                amountPaid: Double(amountPaid),
                vatRate: Double(vatRate),
                includesVat: includesVat,
                invoiceStatus: invoiceStatus.rawValue,
                paymentStatus: paymentStatus.rawValue,
                notes: notes.isEmpty ? nil : notes
            )
            if await viewModel.updateEntry(entry.id, request) {
                dismiss()
            }
        } else {
            let request = CreateIncomeRequest(
                date: dateStr,
                description: description,
                clientName: clientName,
                amountGross: Double(amountGross) ?? 0,
                notes: notes.isEmpty ? nil : notes
            )
            if await viewModel.createEntry(request) {
                dismiss()
            }
        }
    }
}
```

**Step 2: Build and verify**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add income entry form for create and edit"
```

---

## Task 7: Analytics View

**Files:**
- Create: `apps/ios/Seder/ViewModels/AnalyticsViewModel.swift`
- Create: `apps/ios/Seder/Views/Analytics/AnalyticsView.swift`

**Step 1: Create AnalyticsViewModel**

```swift
import Foundation

@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var aggregates: IncomeAggregates?
    @Published var trends: [MonthTrend] = []
    @Published var isLoading = false
    @Published var selectedMonth = Date()

    private let api = APIClient.shared

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    var yearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy"
        return formatter.string(from: selectedMonth)
    }

    func loadAll() async {
        isLoading = true
        defer { isLoading = false }

        async let kpis: IncomeAggregates = api.request(
            endpoint: "/api/v1/analytics/kpis",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let monthTrends: [MonthTrend] = api.request(
            endpoint: "/api/v1/analytics/trends",
            queryItems: [URLQueryItem(name: "year", value: yearString)]
        )

        do {
            aggregates = try await kpis
            trends = try await monthTrends
        } catch {
            // Silently handle — show whatever loaded
        }
    }
}
```

**Step 2: Create AnalyticsView**

```swift
import SwiftUI
import Charts

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    MonthPicker(selectedDate: $viewModel.selectedMonth)
                        .padding(.top)

                    if viewModel.isLoading {
                        ProgressView()
                            .padding(.top, 40)
                    } else if let agg = viewModel.aggregates {
                        // KPI Cards
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            KPICard(title: "הכנסה ברוטו", value: agg.totalGross)
                            KPICard(title: "שולם", value: agg.totalPaid)
                            KPICard(title: "לא שולם", value: agg.totalUnpaid)
                            KPICard(title: "מע״מ", value: agg.vatTotal)
                            KPICard(title: "ממתין לחשבונית", value: agg.readyToInvoice)
                            KPICard(title: "עבודות", value: Double(agg.jobsCount), isCurrency: false)
                        }
                        .padding(.horizontal)

                        // Trend indicator
                        if agg.trend != 0 {
                            HStack {
                                Image(systemName: agg.trend > 0 ? "arrow.up.right" : "arrow.down.right")
                                    .foregroundStyle(agg.trend > 0 ? .green : .red)
                                Text("\(Int(abs(agg.trend)))% לעומת חודש קודם")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal)
                        }

                        // Monthly trends chart
                        if !viewModel.trends.isEmpty {
                            VStack(alignment: .trailing) {
                                Text("סטטוס חודשי")
                                    .font(.headline)
                                    .padding(.horizontal)

                                Chart(viewModel.trends, id: \.month) { trend in
                                    BarMark(
                                        x: .value("חודש", trend.month),
                                        y: .value("סטטוס", 1)
                                    )
                                    .foregroundStyle(trendColor(trend.status))
                                }
                                .frame(height: 120)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
            }
            .navigationTitle("אנליטיקס")
            .task { await viewModel.loadAll() }
            .onChange(of: viewModel.selectedMonth) {
                Task { await viewModel.loadAll() }
            }
        }
    }

    private func trendColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return .green
        case "has-unpaid": return .orange
        default: return .gray.opacity(0.3)
        }
    }
}

struct KPICard: View {
    let title: String
    let value: Double
    var isCurrency: Bool = true

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            if isCurrency {
                CurrencyText(amount: value, font: .title3.bold())
            } else {
                Text("\(Int(value))")
                    .font(.title3.bold())
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add analytics view with KPI cards and trend chart"
```

---

## Task 8: Clients View

**Files:**
- Create: `apps/ios/Seder/ViewModels/ClientsViewModel.swift`
- Create: `apps/ios/Seder/Views/Clients/ClientsView.swift`

**Step 1: Create ClientsViewModel**

```swift
import Foundation

@MainActor
class ClientsViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadClients() async {
        isLoading = true
        defer { isLoading = false }

        do {
            clients = try await api.request(
                endpoint: "/api/v1/clients",
                queryItems: [URLQueryItem(name: "analytics", value: "true")]
            )
        } catch {
            errorMessage = "שגיאה בטעינת לקוחות"
        }
    }

    func createClient(_ request: CreateClientRequest) async -> Bool {
        do {
            let client: Client = try await api.request(
                endpoint: "/api/v1/clients",
                method: "POST",
                body: request
            )
            clients.insert(client, at: 0)
            return true
        } catch {
            errorMessage = "שגיאה ביצירת לקוח"
            return false
        }
    }
}
```

**Step 2: Create ClientsView**

```swift
import SwiftUI

struct ClientsView: View {
    @StateObject private var viewModel = ClientsViewModel()
    @State private var showAddClient = false
    @State private var newClientName = ""

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.clients.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.2")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("אין לקוחות")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    List(viewModel.clients) { client in
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(client.name)
                                .font(.headline)
                            if let revenue = client.thisYearRevenue, revenue > 0 {
                                HStack {
                                    CurrencyText(amount: revenue, font: .subheadline, color: .secondary)
                                    Text("השנה:")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let jobs = client.jobCount, jobs > 0 {
                                Text("\(jobs) עבודות")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .listStyle(.plain)
                    .refreshable { await viewModel.loadClients() }
                }
            }
            .navigationTitle("לקוחות")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddClient = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .alert("לקוח חדש", isPresented: $showAddClient) {
                TextField("שם הלקוח", text: $newClientName)
                Button("ביטול", role: .cancel) { newClientName = "" }
                Button("הוספה") {
                    Task {
                        await viewModel.createClient(CreateClientRequest(name: newClientName))
                        newClientName = ""
                    }
                }
            }
            .task { await viewModel.loadClients() }
        }
    }
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add clients view with analytics"
```

---

## Task 9: Categories View

**Files:**
- Create: `apps/ios/Seder/ViewModels/CategoriesViewModel.swift`
- Create: `apps/ios/Seder/Views/Categories/CategoriesView.swift`

**Step 1: Create CategoriesViewModel**

```swift
import Foundation

@MainActor
class CategoriesViewModel: ObservableObject {
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadCategories() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let all: [Category] = try await api.request(endpoint: "/api/v1/categories")
            categories = all.filter { !$0.isArchived }.sorted { $0.order < $1.order }
        } catch {
            errorMessage = "שגיאה בטעינת קטגוריות"
        }
    }

    func createCategory(_ request: CreateCategoryRequest) async -> Bool {
        do {
            let cat: Category = try await api.request(
                endpoint: "/api/v1/categories",
                method: "POST",
                body: request
            )
            categories.append(cat)
            return true
        } catch {
            errorMessage = "שגיאה ביצירת קטגוריה"
            return false
        }
    }

    func moveCategory(from source: IndexSet, to destination: Int) {
        categories.move(fromOffsets: source, toOffset: destination)
        Task { await saveOrder() }
    }

    private func saveOrder() async {
        let items = categories.enumerated().map { ReorderItem(id: $1.id, displayOrder: $0) }
        do {
            let _: [String: Bool] = try await api.request(
                endpoint: "/api/v1/categories/reorder",
                method: "POST",
                body: items
            )
        } catch {
            errorMessage = "שגיאה בשמירת סדר"
        }
    }
}
```

**Step 2: Create CategoriesView**

```swift
import SwiftUI

struct CategoriesView: View {
    @StateObject private var viewModel = CategoriesViewModel()
    @State private var showAdd = false
    @State private var newName = ""
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else {
                    List {
                        ForEach(viewModel.categories) { cat in
                            HStack {
                                Text(cat.name)
                                    .font(.body)
                                Spacer()
                                Circle()
                                    .fill(categoryColor(cat.color))
                                    .frame(width: 12, height: 12)
                            }
                        }
                        .onMove(perform: viewModel.moveCategory)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("קטגוריות")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
            .alert("קטגוריה חדשה", isPresented: $showAdd) {
                TextField("שם הקטגוריה", text: $newName)
                Button("ביטול", role: .cancel) { newName = "" }
                Button("הוספה") {
                    Task {
                        await viewModel.createCategory(
                            CreateCategoryRequest(name: newName, color: "blue", icon: "Circle")
                        )
                        newName = ""
                    }
                }
            }
            .task { await viewModel.loadCategories() }
        }
    }

    private func categoryColor(_ name: String) -> Color {
        switch name {
        case "emerald": return .green
        case "indigo": return .indigo
        case "sky": return .cyan
        case "amber": return .orange
        case "purple": return .purple
        case "blue": return .blue
        case "rose": return .pink
        case "teal": return .teal
        case "orange": return .orange
        case "pink": return .pink
        case "cyan": return .cyan
        default: return .gray
        }
    }
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add categories view with drag-to-reorder"
```

---

## Task 10: Settings View

**Files:**
- Create: `apps/ios/Seder/Views/Settings/SettingsView.swift`
- Create: `apps/ios/Seder/Views/Settings/ChangePasswordView.swift`

**Step 1: Create SettingsView**

```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @AppStorage("darkMode") private var darkMode = false
    @State private var showChangePassword = false
    @State private var showCategories = false
    @State private var showSignOutConfirm = false

    var body: some View {
        NavigationStack {
            List {
                // Profile section
                Section("פרופיל") {
                    if let user = auth.user {
                        LabeledContent("שם", value: user.name)
                        LabeledContent("אימייל", value: user.email)
                    }
                    Button("שינוי סיסמה") {
                        showChangePassword = true
                    }
                }

                // Preferences
                Section("העדפות") {
                    Toggle("מצב כהה", isOn: $darkMode)
                }

                // Management
                Section("ניהול") {
                    Button("קטגוריות") {
                        showCategories = true
                    }
                }

                // Sign out
                Section {
                    Button("התנתקות", role: .destructive) {
                        showSignOutConfirm = true
                    }
                }
            }
            .navigationTitle("הגדרות")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
            .sheet(isPresented: $showChangePassword) {
                ChangePasswordView()
            }
            .sheet(isPresented: $showCategories) {
                CategoriesView()
            }
            .confirmationDialog("האם להתנתק?", isPresented: $showSignOutConfirm) {
                Button("התנתקות", role: .destructive) {
                    auth.signOut()
                    dismiss()
                }
                Button("ביטול", role: .cancel) {}
            }
            .preferredColorScheme(darkMode ? .dark : nil)
        }
    }
}
```

**Step 2: Create ChangePasswordView**

```swift
import SwiftUI

struct ChangePasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("סיסמה נוכחית", text: $currentPassword)
                        .environment(\.layoutDirection, .leftToRight)
                    SecureField("סיסמה חדשה", text: $newPassword)
                        .environment(\.layoutDirection, .leftToRight)
                    SecureField("אימות סיסמה חדשה", text: $confirmPassword)
                        .environment(\.layoutDirection, .leftToRight)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
            .navigationTitle("שינוי סיסמה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        Task { await changePassword() }
                    }
                    .disabled(isFormInvalid || isLoading)
                }
            }
            .alert("הסיסמה שונתה בהצלחה", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private var isFormInvalid: Bool {
        currentPassword.isEmpty || newPassword.count < 8 || newPassword != confirmPassword
    }

    private func changePassword() async {
        guard newPassword == confirmPassword else {
            errorMessage = "הסיסמאות אינן תואמות"
            return
        }
        isLoading = true
        defer { isLoading = false }

        do {
            struct ChangePasswordRequest: Encodable {
                let currentPassword: String
                let newPassword: String
            }
            let _: EmptyData = try await APIClient.shared.request(
                endpoint: "/api/auth/change-password",
                method: "POST",
                body: ChangePasswordRequest(currentPassword: currentPassword, newPassword: newPassword)
            )
            showSuccess = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בשינוי סיסמה"
        }
    }
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add settings and change password views"
```

---

## Task 11: Wire Up Tab Bar + Navigation

**Files:**
- Modify: `apps/ios/Seder/Views/MainTabView.swift`
- Modify: `apps/ios/Seder/SederApp.swift`

**Step 1: Update MainTabView with real views**

```swift
import SwiftUI

struct MainTabView: View {
    @AppStorage("darkMode") private var darkMode = false

    var body: some View {
        TabView {
            IncomeListView()
                .tabItem {
                    Label("הכנסות", systemImage: "banknote")
                }

            AnalyticsView()
                .tabItem {
                    Label("אנליטיקס", systemImage: "chart.bar")
                }

            ClientsView()
                .tabItem {
                    Label("לקוחות", systemImage: "person.2")
                }

            Text("הוצאות - בקרוב")
                .tabItem {
                    Label("הוצאות", systemImage: "creditcard")
                }
        }
        .preferredColorScheme(darkMode ? .dark : nil)
    }
}
```

**Step 2: Build and run full app flow**

Test on simulator:
1. App launches → sign-in screen (Hebrew, RTL)
2. Sign in → income list with month picker
3. Tab bar shows all 4 tabs
4. Add income entry via + button
5. Swipe actions work (mark sent, mark paid)
6. Analytics tab shows KPIs
7. Clients tab shows client list
8. Settings accessible from profile icon

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): wire up all views in tab navigation"
```

---

## Task 12: Calendar Import View

**Files:**
- Create: `apps/ios/Seder/Views/Calendar/CalendarImportView.swift`

**Step 1: Create CalendarImportView**

```swift
import SwiftUI

struct CalendarImportView: View {
    @Environment(\.dismiss) var dismiss
    @State private var isLoading = false
    @State private var importedCount: Int?
    @State private var errorMessage: String?
    @State private var selectedMonth = Date()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 64))
                    .foregroundStyle(.blue)

                Text("ייבוא מיומן Google")
                    .font(.title2.bold())

                Text("ייבוא אירועים מיומן Google כרשומות הכנסה")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                MonthPicker(selectedDate: $selectedMonth)

                if let count = importedCount {
                    Text("יובאו \(count) רשומות בהצלחה")
                        .foregroundStyle(.green)
                        .font(.headline)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }

                Button {
                    Task { await importEvents() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("ייבוא אירועים")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, 32)
                .disabled(isLoading)

                Spacer()
            }
            .padding()
            .navigationTitle("ייבוא יומן")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
        }
    }

    private func importEvents() async {
        isLoading = true
        importedCount = nil
        errorMessage = nil
        defer { isLoading = false }

        let calendar = Calendar.current
        let year = calendar.component(.year, from: selectedMonth)
        let month = calendar.component(.month, from: selectedMonth)

        struct ImportRequest: Encodable {
            let year: Int
            let month: Int
        }
        struct ImportResponse: Decodable {
            let importedCount: Int
        }

        do {
            let result: ImportResponse = try await APIClient.shared.request(
                endpoint: "/api/v1/calendar/import",
                method: "POST",
                body: ImportRequest(year: year, month: month)
            )
            importedCount = result.importedCount
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בייבוא"
        }
    }
}
```

**Step 2: Add calendar import button to IncomeListView toolbar**

Add to IncomeListView toolbar:
```swift
ToolbarItem(placement: .topBarTrailing) {
    Menu {
        Button { showAddSheet = true } label: {
            Label("הכנסה חדשה", systemImage: "plus")
        }
        Button { showCalendarImport = true } label: {
            Label("ייבוא מיומן", systemImage: "calendar")
        }
    } label: {
        Image(systemName: "plus")
    }
}
```

Add state: `@State private var showCalendarImport = false`
Add sheet: `.sheet(isPresented: $showCalendarImport) { CalendarImportView() }`

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ios): add Google Calendar import view"
```

---

## Task 13: Push Notifications

**Files:**
- Create: `apps/ios/Seder/Services/NotificationService.swift`
- Modify: `apps/ios/Seder/SederApp.swift`

**Step 1: Create NotificationService**

```swift
import Foundation
import UserNotifications
import UIKit

class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    func registerToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        Task {
            struct RegisterRequest: Encodable {
                let token: String
                let platform: String
            }
            do {
                let _: EmptyData = try await APIClient.shared.request(
                    endpoint: "/api/v1/devices",
                    method: "POST",
                    body: RegisterRequest(token: token, platform: "ios")
                )
            } catch {
                print("Failed to register push token: \(error)")
            }
        }
    }
}
```

**Step 2: Add AppDelegate for push notification callbacks**

Add to SederApp.swift:
```swift
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationService.shared.registerToken(deviceToken)
    }
}
```

And in SederApp:
```swift
@UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
```

**Step 3: Request notification permission after auth**

In SederApp, after `isAuthenticated` is true:
```swift
.onAppear {
    if authViewModel.isAuthenticated {
        NotificationService.shared.requestPermission()
    }
}
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add push notification registration"
```

---

## Task 14: Final Polish + Build for Device

**Step 1: Add app icon**

Copy existing icon from `apps/mobile/assets/images/icon.png` to `apps/ios/Seder/Assets.xcassets/AppIcon.appiconset/`

**Step 2: Test on physical device**

1. Connect iPhone via USB
2. In Xcode: Select your device as target
3. Cmd+R to build and run
4. Trust the developer certificate on iPhone: Settings → General → VPN & Device Management

**Step 3: Verify RTL layout on device**

Confirm:
- Tab bar labels in Hebrew, rightmost tab is הכנסות
- Text aligns right
- Month picker arrows correct direction
- Income entries right-aligned
- Forms right-aligned with LTR inputs for email/numbers

**Step 4: Final commit**

```bash
git add -A && git commit -m "feat(ios): polish and verify device build"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 0 | Delete Expo app | None |
| 1 | Xcode project setup | None |
| 2 | APIClient + Keychain | Task 1 |
| 3 | Data models | Task 1 |
| 4 | Auth views | Tasks 2, 3 |
| 5 | Income list | Tasks 2, 3, 4 |
| 6 | Income form | Task 5 |
| 7 | Analytics | Tasks 2, 3 |
| 8 | Clients | Tasks 2, 3 |
| 9 | Categories | Tasks 2, 3 |
| 10 | Settings | Tasks 2, 3, 4 |
| 11 | Wire up navigation | Tasks 5-10 |
| 12 | Calendar import | Tasks 2, 5 |
| 13 | Push notifications | Tasks 2, 4 |
| 14 | Polish + device build | All |
