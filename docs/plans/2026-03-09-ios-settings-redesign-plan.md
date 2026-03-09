# iOS Settings Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring iOS settings to full parity with the web app — account, preferences, calendar status, data export, and account deletion.

**Architecture:** Expand the existing `SettingsView` with new sections using the existing `SettingsSection`/`SettingsRow` pattern. Add two new API routes on the web backend (export + delete account). New sheets for email change, export, and delete confirmation.

**Tech Stack:** SwiftUI, existing APIClient, existing `SettingsSection`/`SettingsRow` components, Next.js API routes (Drizzle ORM).

**RTL:** ALL views use `.environment(\.layoutDirection, .rightToLeft)` on outermost NavigationStack. In HStack: first item = RIGHT side. Labels use `.leading` alignment (= right in RTL).

---

### Task 1: New API Routes — Export & Delete Account

**Files:**
- Create: `apps/web/app/api/v1/settings/export/route.ts`
- Create: `apps/web/app/api/v1/settings/account/route.ts`

**Step 1: Create the export endpoint**

```typescript
// apps/web/app/api/v1/settings/export/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { db } from "@/db/client";
import { incomeEntries, categories } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { includeIncomeEntries, includeCategories, dateRange } = body;

    const csvParts: string[] = [];

    if (includeIncomeEntries) {
      const dateConditions = [eq(incomeEntries.userId, userId)];

      if (dateRange === "thisYear") {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
        dateConditions.push(gte(incomeEntries.date, startOfYear));
      } else if (dateRange === "thisMonth") {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        dateConditions.push(gte(incomeEntries.date, startOfMonth));
      }

      const entries = await db
        .select()
        .from(incomeEntries)
        .where(and(...dateConditions));

      if (entries.length > 0) {
        const headers = ["תאריך", "תיאור", "לקוח", "סכום ברוטו", "סכום ששולם", "אחוז מעמ", "כולל מעמ", "סטטוס חשבונית", "סטטוס תשלום", "הערות"];
        const rows = entries.map((e) => [
          e.date,
          `"${e.description.replace(/"/g, '""')}"`,
          `"${e.clientName.replace(/"/g, '""')}"`,
          e.amountGross,
          e.amountPaid,
          e.vatRate,
          e.includesVat ? "כן" : "לא",
          e.invoiceStatus,
          e.paymentStatus,
          `"${(e.notes || "").replace(/"/g, '""')}"`,
        ]);
        csvParts.push("# הכנסות");
        csvParts.push(headers.join(","));
        csvParts.push(...rows.map((r) => r.join(",")));
      }
    }

    if (includeCategories) {
      const userCategories = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId));

      if (userCategories.length > 0) {
        if (csvParts.length > 0) csvParts.push("");
        const headers = ["שם", "צבע", "אייקון", "מאורכב"];
        const rows = userCategories.map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          c.color,
          c.icon,
          c.isArchived ? "כן" : "לא",
        ]);
        csvParts.push("# קטגוריות");
        csvParts.push(headers.join(","));
        csvParts.push(...rows.map((r) => r.join(",")));
      }
    }

    if (csvParts.length === 0) {
      return apiSuccess({ csv: "" });
    }

    const bom = "\uFEFF";
    const csvContent = bom + csvParts.join("\n");
    return apiSuccess({ csv: csvContent });
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 2: Create the delete account endpoint**

```typescript
// apps/web/app/api/v1/settings/account/route.ts
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { db } from "@/db/client";
import { incomeEntries, categories, clients, session, account, userSettings, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  try {
    const userId = await requireAuth();

    await db.transaction(async (tx) => {
      await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
      await tx.delete(categories).where(eq(categories.userId, userId));
      await tx.delete(clients).where(eq(clients.userId, userId));
      await tx.delete(session).where(eq(session.userId, userId));
      await tx.delete(account).where(eq(account.userId, userId));
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));
      await tx.delete(user).where(eq(user.id, userId));
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/app/api/v1/settings/export/route.ts apps/web/app/api/v1/settings/account/route.ts
git commit -m "feat(api): add export CSV and delete account REST endpoints"
```

---

### Task 2: Extend iOS Settings Model

**Files:**
- Modify: `apps/ios/Seder/Seder/Models/Settings.swift`

**Step 1: Extend the models**

Replace the entire file with:

```swift
import Foundation

nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
    let calendarSettings: CalendarSettingsData?
}

nonisolated struct UpdateSettingsRequest: Encodable, Sendable {
    var theme: String?
    var language: String?
    var timezone: String?
    var defaultCurrency: String?
}

nonisolated struct ExportRequest: Encodable, Sendable {
    let includeIncomeEntries: Bool
    let includeCategories: Bool
    let dateRange: String // "all", "thisYear", "thisMonth"
}

nonisolated struct ExportResponse: Decodable, Sendable {
    let csv: String
}
```

Note: `CalendarSettingsData` already exists in `CalendarImportViewModel.swift` — it was declared `private`. Change it to `internal` (remove `private`) so it can be reused here.

**Step 2: Make `CalendarSettingsData` accessible**

In `apps/ios/Seder/Seder/ViewModels/CalendarImportViewModel.swift`, change the visibility of `CalendarSettingsData` and `CalendarSettingsResponse` from `private` to internal:

```swift
// Change from:
private struct CalendarSettingsResponse: Decodable {
// To:
struct CalendarSettingsResponse: Decodable {

// Change from:
private struct CalendarSettingsData: Decodable {
// To:  (already done above — it's used in UserSettings now)
// CalendarSettingsData is now defined in Settings.swift, remove from here
```

Actually, cleaner approach: move `CalendarSettingsData` to `Settings.swift` (it's already there in the new UserSettings) and remove the duplicate from CalendarImportViewModel. Keep `CalendarSettingsResponse`, `CalendarSettingsUpdateRequest`, and `CalendarSettingsPayload` as private in the ViewModel since they're only used there.

**Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Settings.swift apps/ios/Seder/Seder/ViewModels/CalendarImportViewModel.swift
git commit -m "feat(ios): extend settings models for preferences, export, and calendar"
```

---

### Task 3: SettingsViewModel

**Files:**
- Create: `apps/ios/Seder/Seder/ViewModels/SettingsViewModel.swift`

**Step 1: Create the ViewModel**

```swift
import Combine
import Foundation
import SwiftUI

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var settings: UserSettings?
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Preferences (local state synced with server)
    @Published var currency: String = "ILS"
    @Published var timezone: String = "Asia/Jerusalem"
    @Published var language: String = "he"

    // Calendar
    @Published var calendarConnected = false

    // Export
    @Published var isExporting = false
    @Published var exportCSV: String?

    private let api = APIClient.shared

    // MARK: - Load Settings

    func loadSettings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let s: UserSettings? = try await api.request(endpoint: "/api/v1/settings")
            settings = s
            if let s {
                currency = s.defaultCurrency ?? "ILS"
                timezone = s.timezone ?? "Asia/Jerusalem"
                language = s.language ?? "he"
            }
        } catch {
            // Use defaults
        }
    }

    // MARK: - Save Preferences

    func savePreferences() async {
        let body = UpdateSettingsRequest(
            language: language,
            timezone: timezone,
            defaultCurrency: currency
        )
        do {
            let _: UserSettings = try await api.request(
                endpoint: "/api/v1/settings",
                method: "PUT",
                body: body
            )
        } catch {
            errorMessage = "שגיאה בשמירת הגדרות"
        }
    }

    // MARK: - Calendar Status

    func checkCalendarStatus() async {
        do {
            let response: CalendarStatusResponse = try await api.request(
                endpoint: "/api/v1/calendar/list"
            )
            calendarConnected = response.connected
        } catch {
            calendarConnected = false
        }
    }

    // MARK: - Export

    func exportData(includeIncome: Bool, includeCategories: Bool, dateRange: String) async -> String? {
        isExporting = true
        defer { isExporting = false }

        let body = ExportRequest(
            includeIncomeEntries: includeIncome,
            includeCategories: includeCategories,
            dateRange: dateRange
        )

        do {
            let response: ExportResponse = try await api.request(
                endpoint: "/api/v1/settings/export",
                method: "POST",
                body: body
            )
            return response.csv.isEmpty ? nil : response.csv
        } catch {
            errorMessage = "שגיאה בייצוא נתונים"
            return nil
        }
    }

    // MARK: - Delete Account

    func deleteAccount() async -> Bool {
        isLoading = true
        defer { isLoading = false }

        do {
            struct DeleteResponse: Decodable { let success: Bool }
            let _: DeleteResponse = try await api.request(
                endpoint: "/api/v1/settings/account",
                method: "DELETE"
            )
            return true
        } catch {
            errorMessage = "שגיאה במחיקת החשבון"
            return false
        }
    }
}

// MARK: - Response Types

private struct CalendarStatusResponse: Decodable {
    let connected: Bool
    let calendars: [GoogleCalendar]
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/SettingsViewModel.swift
git commit -m "feat(ios): add SettingsViewModel with preferences, export, and delete"
```

---

### Task 4: ExportDataSheet

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Settings/ExportDataSheet.swift`

**Step 1: Create the export sheet**

```swift
import SwiftUI

struct ExportDataSheet: View {
    @ObservedObject var viewModel: SettingsViewModel
    @Environment(\.dismiss) var dismiss
    @State private var exportType = "both"  // "income", "categories", "both"
    @State private var dateRange = "all"    // "all", "thisYear", "thisMonth"
    @State private var showShareSheet = false
    @State private var csvData: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // What to export
                VStack(alignment: .leading, spacing: 8) {
                    Text("מה לייצא")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Picker("", selection: $exportType) {
                        Text("הכנסות").tag("income")
                        Text("קטגוריות").tag("categories")
                        Text("הכל").tag("both")
                    }
                    .pickerStyle(.segmented)
                }

                // Date range
                VStack(alignment: .leading, spacing: 8) {
                    Text("טווח תאריכים")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Picker("", selection: $dateRange) {
                        Text("החודש").tag("thisMonth")
                        Text("השנה").tag("thisYear")
                        Text("הכל").tag("all")
                    }
                    .pickerStyle(.segmented)
                }

                if let error = errorMessage {
                    Text(error)
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(.red)
                }

                Spacer()

                Button {
                    Task { await doExport() }
                } label: {
                    if viewModel.isExporting {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("ייצוא")
                            .font(SederTheme.ploni(18, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(SederTheme.brandGreen)
                .disabled(viewModel.isExporting)
            }
            .padding(16)
            .navigationTitle("ייצוא נתונים")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let csv = csvData {
                    ShareSheet(items: [csvFileURL(from: csv)])
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func doExport() async {
        errorMessage = nil
        let includeIncome = exportType == "income" || exportType == "both"
        let includeCats = exportType == "categories" || exportType == "both"

        if let csv = await viewModel.exportData(
            includeIncome: includeIncome,
            includeCategories: includeCats,
            dateRange: dateRange
        ) {
            csvData = csv
            showShareSheet = true
        } else {
            errorMessage = "אין נתונים לייצוא"
        }
    }

    private func csvFileURL(from content: String) -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("seder-export.csv")
        try? content.write(to: fileURL, atomically: true, encoding: .utf8)
        return fileURL
    }
}

// MARK: - UIKit Share Sheet wrapper

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Settings/ExportDataSheet.swift
git commit -m "feat(ios): add CSV export sheet with share sheet integration"
```

---

### Task 5: ChangeEmailView

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Settings/ChangeEmailView.swift`

**Step 1: Create the email change view**

```swift
import SwiftUI

struct ChangeEmailView: View {
    @Environment(\.dismiss) var dismiss
    @State private var newEmail = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccess = false

    let currentEmail: String

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text(currentEmail)
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textSecondary)
                        Spacer()
                        Text("אימייל נוכחי")
                            .font(SederTheme.ploni(14))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                }

                Section {
                    TextField("אימייל חדש", text: $newEmail)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .environment(\.layoutDirection, .leftToRight)
                }

                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
            .navigationTitle("שינוי אימייל")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        Task { await changeEmail() }
                    }
                    .disabled(newEmail.isEmpty || isLoading)
                }
            }
            .alert("האימייל שונה בהצלחה", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func changeEmail() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        do {
            struct ChangeEmailRequest: Encodable {
                let newEmail: String
            }
            let _: EmptyData = try await APIClient.shared.directRequest(
                endpoint: "/api/auth/change-email",
                method: "POST",
                body: ChangeEmailRequest(newEmail: newEmail)
            )
            showSuccess = true
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "שגיאה בשינוי אימייל"
        }
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Settings/ChangeEmailView.swift
git commit -m "feat(ios): add change email view"
```

---

### Task 6: Rewrite SettingsView — Full Redesign

**Files:**
- Rewrite: `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift`

**Step 1: Rewrite the view**

Keep the existing `SettingsSection` and `SettingsRow` helper structs. Replace the `SettingsView` body with all sections.

```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @StateObject private var viewModel = SettingsViewModel()

    @State private var showChangePassword = false
    @State private var showChangeEmail = false
    @State private var showCategories = false
    @State private var showExport = false
    @State private var showSignOutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var showDeleteFinalConfirm = false
    @State private var deleteConfirmText = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Profile card
                    if let user = auth.user {
                        VStack(spacing: 12) {
                            Text(String(user.displayName.prefix(1)))
                                .font(.title.weight(.semibold))
                                .foregroundStyle(SederTheme.brandGreen)
                                .frame(width: 56, height: 56)
                                .background(SederTheme.brandGreen.opacity(0.1))
                                .clipShape(Circle())

                            Text(user.displayName)
                                .font(SederTheme.ploni(18, weight: .semibold))
                                .foregroundStyle(SederTheme.textPrimary)
                            Text(user.email)
                                .font(SederTheme.ploni(14))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
                    }

                    // Account
                    SettingsSection(title: "חשבון") {
                        SettingsRow(icon: "lock.rotation", label: "שינוי סיסמה") {
                            showChangePassword = true
                        }
                        Divider().padding(.horizontal, 16)
                        SettingsRow(icon: "envelope", label: "שינוי אימייל") {
                            showChangeEmail = true
                        }
                    }

                    // Preferences
                    SettingsSection(title: "העדפות") {
                        VStack(spacing: 0) {
                            // Appearance
                            HStack {
                                Spacer()
                                HStack(spacing: 8) {
                                    Text("מראה")
                                        .font(SederTheme.ploni(16))
                                        .foregroundStyle(SederTheme.textPrimary)
                                    Image(systemName: "paintbrush")
                                        .font(.body)
                                        .foregroundStyle(SederTheme.textSecondary)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 8)

                            Picker("", selection: $appearanceMode) {
                                Text("כהה").tag("dark")
                                Text("בהיר").tag("light")
                                Text("מערכת").tag("system")
                            }
                            .pickerStyle(.segmented)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 12)

                            Divider().padding(.horizontal, 16)

                            // Currency
                            preferencePicker(
                                icon: "sheqelsign.circle",
                                label: "מטבע",
                                selection: $viewModel.currency,
                                options: [("ILS", "₪ שקל"), ("USD", "$ דולר"), ("EUR", "€ אירו")]
                            )

                            Divider().padding(.horizontal, 16)

                            // Timezone
                            preferencePicker(
                                icon: "clock",
                                label: "אזור זמן",
                                selection: $viewModel.timezone,
                                options: [("Asia/Jerusalem", "ירושלים")]
                            )

                            Divider().padding(.horizontal, 16)

                            // Language
                            HStack {
                                HStack(spacing: 6) {
                                    Picker("", selection: $viewModel.language) {
                                        Text("עברית").tag("he")
                                        Text("English").tag("en")
                                    }
                                    .pickerStyle(.menu)
                                    .tint(SederTheme.textPrimary)

                                    if viewModel.language == "en" {
                                        Text("בקרוב")
                                            .font(SederTheme.ploni(11, weight: .medium))
                                            .foregroundStyle(SederTheme.sentColor)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(SederTheme.sentColor.opacity(0.1))
                                            .clipShape(Capsule())
                                    }
                                }

                                Spacer()

                                HStack(spacing: 8) {
                                    Text("שפה")
                                        .font(SederTheme.ploni(16))
                                        .foregroundStyle(SederTheme.textPrimary)
                                    Image(systemName: "globe")
                                        .font(.body)
                                        .foregroundStyle(SederTheme.textSecondary)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                    }

                    // Calendar
                    SettingsSection(title: "יומן") {
                        HStack {
                            if viewModel.calendarConnected {
                                Button {
                                    if let url = URL(string: "https://sedder.app/settings") {
                                        UIApplication.shared.open(url)
                                    }
                                } label: {
                                    Text("ניהול חיבור")
                                        .font(SederTheme.ploni(14, weight: .medium))
                                        .foregroundStyle(SederTheme.brandGreen)
                                }
                            } else {
                                Button {
                                    if let url = URL(string: "https://sedder.app/settings") {
                                        UIApplication.shared.open(url)
                                    }
                                } label: {
                                    Text("חבר דרך האתר")
                                        .font(SederTheme.ploni(14, weight: .medium))
                                        .foregroundStyle(SederTheme.brandGreen)
                                }
                            }

                            Spacer()

                            HStack(spacing: 8) {
                                Text(viewModel.calendarConnected ? "מחובר" : "לא מחובר")
                                    .font(SederTheme.ploni(16))
                                    .foregroundStyle(SederTheme.textPrimary)
                                Circle()
                                    .fill(viewModel.calendarConnected ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)
                                Image(systemName: "calendar")
                                    .font(.body)
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }

                    // Data
                    SettingsSection(title: "נתונים") {
                        SettingsRow(icon: "square.and.arrow.up", label: "ייצוא CSV") {
                            showExport = true
                        }
                    }

                    // Management
                    SettingsSection(title: "ניהול") {
                        SettingsRow(icon: "tag", label: "קטגוריות") {
                            showCategories = true
                        }
                    }

                    // Danger zone
                    SettingsSection(title: "אזור מסוכן") {
                        Button {
                            showDeleteConfirm = true
                        } label: {
                            HStack {
                                Spacer()
                                HStack(spacing: 8) {
                                    Text("מחיקת חשבון")
                                        .font(SederTheme.ploni(16))
                                    Image(systemName: "trash")
                                }
                                .foregroundStyle(.red)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                        }
                    }

                    // Sign out
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("התנתקות", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(SederTheme.ploni(16, weight: .medium))
                            Spacer()
                        }
                        .padding(.vertical, 14)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.2), lineWidth: 1)
                        )
                    }

                    Spacer().frame(height: 20)
                }
                .padding(12)
            }
            .background(SederTheme.pageBg)
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
            .sheet(isPresented: $showChangeEmail) {
                ChangeEmailView(currentEmail: auth.user?.email ?? "")
            }
            .sheet(isPresented: $showCategories) {
                CategoriesView()
            }
            .sheet(isPresented: $showExport) {
                ExportDataSheet(viewModel: viewModel)
            }
            .confirmationDialog("האם להתנתק?", isPresented: $showSignOutConfirm) {
                Button("התנתקות", role: .destructive) {
                    auth.signOut()
                    dismiss()
                }
                Button("ביטול", role: .cancel) {}
            }
            .alert("מחיקת חשבון", isPresented: $showDeleteConfirm) {
                Button("ביטול", role: .cancel) {}
                Button("המשך", role: .destructive) {
                    showDeleteFinalConfirm = true
                }
            } message: {
                Text("פעולה זו תמחק את כל הנתונים שלך לצמיתות. האם להמשיך?")
            }
            .alert("הקלד DELETE לאישור", isPresented: $showDeleteFinalConfirm) {
                TextField("DELETE", text: $deleteConfirmText)
                    .environment(\.layoutDirection, .leftToRight)
                Button("ביטול", role: .cancel) {
                    deleteConfirmText = ""
                }
                Button("מחק לצמיתות", role: .destructive) {
                    guard deleteConfirmText == "DELETE" else { return }
                    Task {
                        if await viewModel.deleteAccount() {
                            auth.signOut()
                            dismiss()
                        }
                    }
                }
            }
            .preferredColorScheme(appearanceMode == "dark" ? .dark : appearanceMode == "light" ? .light : nil)
            .task {
                await viewModel.loadSettings()
                await viewModel.checkCalendarStatus()
            }
            .onChange(of: viewModel.currency) { _ in Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.timezone) { _ in Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.language) { _ in Task { await viewModel.savePreferences() } }
        }
    }

    // MARK: - Preference Picker Row

    private func preferencePicker(icon: String, label: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        HStack {
            Picker("", selection: selection) {
                ForEach(options, id: \.0) { value, display in
                    Text(display).tag(value)
                }
            }
            .pickerStyle(.menu)
            .tint(SederTheme.textPrimary)

            Spacer()

            HStack(spacing: 8) {
                Text(label)
                    .font(SederTheme.ploni(16))
                    .foregroundStyle(SederTheme.textPrimary)
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// Keep existing helper structs unchanged:
// SettingsSection, SettingsRow
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Settings/SettingsView.swift
git commit -m "feat(ios): full settings redesign with all sections"
```

---

### Task 7: Wire Up & Test

**Step 1: Verify all imports and references compile**

Check that:
- `SettingsViewModel` is accessible from `SettingsView`
- `ExportDataSheet` and `ChangeEmailView` are accessible
- `CalendarSettingsData` is not duplicated between `Settings.swift` and `CalendarImportViewModel.swift`
- `EmptyData` type exists (check `APIResponse.swift`)

**Step 2: Test the full flow**

1. Open Settings → verify all sections render
2. Change currency → verify saves (check via web app)
3. Tap "ייצוא CSV" → verify sheet opens, export works, share sheet appears
4. Tap "שינוי אימייל" → verify sheet opens
5. Tap "מחיקת חשבון" → verify two-step confirmation
6. Calendar status shows correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ios): complete settings page redesign with full web parity"
```
