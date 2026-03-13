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

    // Nudge settings
    @Published var nudgeInvoiceDays: Int = 3
    @Published var nudgePaymentDays: Int = 14
    @Published var nudgePushPrefs: NudgePushPreferences = .defaults

    // Calendar
    @Published var calendarConnected = false

    // Export
    @Published var isExporting = false

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
                nudgeInvoiceDays = s.nudgeInvoiceDays?.intValue ?? 3
                nudgePaymentDays = s.nudgePaymentDays?.intValue ?? 14
                nudgePushPrefs = s.nudgePushEnabled ?? .defaults
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

    // MARK: - Save Nudge Settings

    func saveNudgeSettings() async {
        let body = UpdateNudgeSettingsRequest(
            nudgeInvoiceDays: String(nudgeInvoiceDays),
            nudgePaymentDays: String(nudgePaymentDays),
            nudgePushEnabled: nudgePushPrefs
        )
        do {
            let _: UserSettings = try await api.request(
                endpoint: "/api/v1/settings",
                method: "PUT",
                body: body
            )
        } catch {
            errorMessage = "שגיאה בשמירת הגדרות תזכורות"
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
            if let csv = response.csv, !csv.isEmpty {
                return csv
            }
            return nil
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
            struct DeleteResponse: Decodable { let deleted: Bool }
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
