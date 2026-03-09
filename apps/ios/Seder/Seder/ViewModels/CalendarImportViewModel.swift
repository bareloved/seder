import Combine
import Foundation
import SwiftUI

@MainActor
class CalendarImportViewModel: ObservableObject {
    enum Step { case selectCalendar, preview }

    @Published var step: Step = .selectCalendar
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Step 1
    @Published var calendars: [GoogleCalendar] = []
    @Published var selectedCalendarIds: Set<String> = []
    @Published var selectedMonth = Date()

    // Step 2
    @Published var classifiedEvents: [ClassifiedEvent] = []
    @Published var hidePersonal = false
    @Published var rules: [ClassificationRule] = ClassificationEngine.defaultRules

    private let api = APIClient.shared
    private let savedCalendarsKey = "seder_selected_calendar_ids"

    var displayedEvents: [ClassifiedEvent] {
        if hidePersonal {
            return classifiedEvents.filter { $0.isWork || $0.event.alreadyImported }
        }
        return classifiedEvents
    }

    var selectedCount: Int {
        classifiedEvents.filter(\.selected).count
    }

    var workCount: Int {
        classifiedEvents.filter { $0.isWork && !$0.event.alreadyImported }.count
    }

    // MARK: - Step 1: Load Calendars

    func loadCalendars() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: CalendarListResponse = try await api.request(
                endpoint: "/api/v1/calendar/list"
            )
            calendars = response.calendars
            // Restore saved selection or default to primary
            let saved = UserDefaults.standard.stringArray(forKey: savedCalendarsKey)
            if let saved, !saved.isEmpty {
                selectedCalendarIds = Set(saved)
            } else if let primary = calendars.first(where: { $0.primary == true }) {
                selectedCalendarIds = [primary.id]
            }
        } catch {
            errorMessage = "שגיאה בטעינת יומנים"
        }
    }

    // MARK: - Step 2: Fetch Events + Classify

    func fetchAndClassifyEvents() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let cal = Calendar.current
        let year = cal.component(.year, from: selectedMonth)
        let month = cal.component(.month, from: selectedMonth)
        let calIds = selectedCalendarIds.joined(separator: ",")

        do {
            // Fetch events
            let events: [CalendarEvent] = try await api.request(
                endpoint: "/api/v1/calendar/events",
                queryItems: [
                    URLQueryItem(name: "year", value: String(year)),
                    URLQueryItem(name: "month", value: String(month)),
                    URLQueryItem(name: "calendarIds", value: calIds),
                ]
            )

            // Fetch rules from server
            await loadRules()

            // Classify
            classifiedEvents = ClassificationEngine.classify(events: events, rules: rules)

            if events.isEmpty {
                errorMessage = "לא נמצאו אירועים בחודש זה"
            } else {
                step = .preview
            }
        } catch {
            errorMessage = "שגיאה בטעינת אירועים"
        }
    }

    // MARK: - Rules

    func loadRules() async {
        do {
            let settings: CalendarSettingsResponse = try await api.request(
                endpoint: "/api/v1/settings"
            )
            if let calSettings = settings.calendarSettings,
               let rulesData = calSettings.rules,
               !rulesData.isEmpty {
                rules = rulesData
            }
        } catch {
            // Use defaults if fetch fails
        }
    }

    func saveRules() async {
        let body = CalendarSettingsUpdateRequest(
            calendarSettings: CalendarSettingsPayload(rules: rules)
        )
        do {
            let _: CalendarSettingsResponse = try await api.request(
                endpoint: "/api/v1/settings",
                method: "PUT",
                body: body
            )
            // Re-classify with updated rules
            let events = classifiedEvents.map(\.event)
            classifiedEvents = ClassificationEngine.classify(events: events, rules: rules)
        } catch {
            errorMessage = "שגיאה בשמירת כללים"
        }
    }

    // MARK: - Selection Actions

    func selectAllWork() {
        for i in classifiedEvents.indices {
            if classifiedEvents[i].isWork && !classifiedEvents[i].event.alreadyImported {
                classifiedEvents[i].selected = true
            }
        }
    }

    func clearSelection() {
        for i in classifiedEvents.indices {
            classifiedEvents[i].selected = false
        }
    }

    func toggleEvent(_ id: String) {
        if let i = classifiedEvents.firstIndex(where: { $0.id == id }) {
            guard !classifiedEvents[i].event.alreadyImported else { return }
            classifiedEvents[i].selected.toggle()
        }
    }

    // MARK: - Import

    func importSelected() async -> Int {
        isLoading = true
        defer { isLoading = false }

        let toImport = classifiedEvents.filter(\.selected)
        var importedCount = 0
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        for item in toImport {
            // Parse ISO date to yyyy-MM-dd
            let dateString: String
            if let isoDate = ISO8601DateFormatter().date(from: item.event.start) {
                dateString = dateFormatter.string(from: isoDate)
            } else {
                dateString = String(item.event.start.prefix(10))
            }

            let request = CreateIncomeRequest(
                date: dateString,
                description: item.event.summary,
                amountGross: 0,
                calendarEventId: item.event.id,
                notes: "יובא מהיומן"
            )

            do {
                let _: IncomeEntry = try await api.request(
                    endpoint: "/api/v1/income",
                    method: "POST",
                    body: request
                )
                importedCount += 1
            } catch {
                // Skip duplicates silently
            }
        }

        return importedCount
    }

    // MARK: - Helpers

    func saveCalendarSelection() {
        UserDefaults.standard.set(Array(selectedCalendarIds), forKey: savedCalendarsKey)
    }

    func toggleCalendar(_ id: String) {
        if selectedCalendarIds.contains(id) {
            selectedCalendarIds.remove(id)
        } else {
            selectedCalendarIds.insert(id)
        }
        saveCalendarSelection()
    }
}

// MARK: - API Response Types

private struct CalendarListResponse: Decodable {
    let connected: Bool
    let calendars: [GoogleCalendar]
}

private struct CalendarSettingsResponse: Decodable {
    let calendarSettings: CalendarSettingsData?
}

private struct CalendarSettingsUpdateRequest: Encodable {
    let calendarSettings: CalendarSettingsPayload
}

private struct CalendarSettingsPayload: Encodable {
    let rules: [ClassificationRule]
}
