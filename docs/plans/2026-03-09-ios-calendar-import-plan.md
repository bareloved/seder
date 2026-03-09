# iOS Calendar Import — Multi-Step Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-step calendar import with a 3-step flow: calendar selection → event preview with smart classification → selective import.

**Architecture:** New `CalendarImportViewModel` manages the entire flow state. Three views (CalendarSelectView, EventPreviewView, RulesManagerView) replace the existing CalendarImportView. Classification runs client-side using rules fetched from the server settings API.

**Tech Stack:** SwiftUI, async/await, existing APIClient, UserDefaults for calendar selection persistence.

**RTL:** ALL views use `.environment(\.layoutDirection, .rightToLeft)` on the outermost NavigationStack. In HStack: first item = RIGHT side. VStack labels use `.leading` alignment (= right in RTL).

---

### Task 1: Models — CalendarEvent, GoogleCalendar, ClassificationRule

**Files:**
- Create: `apps/ios/Seder/Seder/Models/CalendarEvent.swift`

**Step 1: Create the models file**

```swift
import Foundation

nonisolated struct GoogleCalendar: Codable, Identifiable, Sendable {
    let id: String
    let summary: String
    let primary: Bool?
}

nonisolated struct CalendarEvent: Codable, Identifiable, Sendable {
    let id: String
    let summary: String
    let start: String  // ISO date string
    let end: String
    let calendarId: String
    let alreadyImported: Bool
}

nonisolated struct ClassificationRule: Codable, Identifiable, Sendable {
    let id: String
    let type: String       // "work" or "personal"
    let matchType: String  // "title" or "calendar"
    var keywords: [String]
    var enabled: Bool
}

struct ClassificationResult {
    let eventId: String
    let isWork: Bool
    let confidence: Double
    let matchedRule: String?
    let matchedKeyword: String?
}

struct ClassifiedEvent: Identifiable {
    let event: CalendarEvent
    let isWork: Bool
    let confidence: Double
    var selected: Bool
    var id: String { event.id }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Models/CalendarEvent.swift
git commit -m "feat(ios): add calendar import models"
```

---

### Task 2: Classification Engine

**Files:**
- Create: `apps/ios/Seder/Seder/Lib/ClassificationEngine.swift`

Port the web's `classificationRules.ts` logic to Swift.

**Step 1: Create the classification engine**

```swift
import Foundation

enum ClassificationEngine {
    // Hebrew → English translation pairs (matching web app)
    static let translations: [String: [String]] = [
        "הופעה": ["gig", "show", "concert", "performance"],
        "חתונה": ["wedding"],
        "חזרה": ["rehearsal"],
        "שיעור": ["lesson", "class", "teaching"],
        "פגישה": ["meeting"],
        "להקה": ["band"],
        "ישיבה": ["meeting", "session"],
        "פרויקט": ["project"],
        "רופא": ["doctor", "dr"],
        "שיניים": ["dentist", "dental"],
        "יום הולדת": ["birthday", "bday"],
        "חדר כושר": ["gym", "fitness"],
        "ספורט": ["sport", "sports", "workout"],
        "אמא": ["mom", "mother"],
        "אבא": ["dad", "father"],
        "משפחה": ["family"],
        "חופשה": ["vacation", "holiday"],
    ]

    static let defaultRules: [ClassificationRule] = [
        ClassificationRule(
            id: "work-default-title",
            type: "work",
            matchType: "title",
            keywords: ["הופעה", "חתונה", "חזרה", "שיעור", "להקה", "פגישה", "ישיבה", "פרויקט"],
            enabled: true
        ),
        ClassificationRule(
            id: "personal-default-title",
            type: "personal",
            matchType: "title",
            keywords: ["רופא", "שיניים", "אמא", "אבא", "ספורט", "חדר כושר", "יום הולדת", "משפחה", "חופשה"],
            enabled: true
        ),
    ]

    static func classify(events: [CalendarEvent], rules: [ClassificationRule]) -> [ClassifiedEvent] {
        events.map { event in
            let result = classifyEvent(event, rules: rules)
            let autoSelect = !event.alreadyImported && result.isWork && result.confidence >= 0.7
            return ClassifiedEvent(
                event: event,
                isWork: result.isWork,
                confidence: result.confidence,
                selected: autoSelect
            )
        }
    }

    private static func classifyEvent(_ event: CalendarEvent, rules: [ClassificationRule]) -> ClassificationResult {
        let titleLower = event.summary.lowercased()

        for rule in rules where rule.enabled {
            if rule.matchType == "title" {
                for keyword in rule.keywords {
                    let variations = getKeywordVariations(keyword)
                    for variation in variations {
                        if titleLower.contains(variation) {
                            return ClassificationResult(
                                eventId: event.id,
                                isWork: rule.type == "work",
                                confidence: 0.85,
                                matchedRule: rule.id,
                                matchedKeyword: keyword
                            )
                        }
                    }
                }
            }

            if rule.matchType == "calendar" {
                let calLower = event.calendarId.lowercased()
                for keyword in rule.keywords {
                    let variations = getKeywordVariations(keyword)
                    for variation in variations {
                        if calLower.contains(variation) {
                            return ClassificationResult(
                                eventId: event.id,
                                isWork: rule.type == "work",
                                confidence: 0.9,
                                matchedRule: rule.id,
                                matchedKeyword: keyword
                            )
                        }
                    }
                }
            }
        }

        // No match — default to work with low confidence
        return ClassificationResult(
            eventId: event.id, isWork: true, confidence: 0.5,
            matchedRule: nil, matchedKeyword: nil
        )
    }

    private static func getKeywordVariations(_ keyword: String) -> [String] {
        var variations = [keyword.lowercased()]
        if let translated = translations[keyword] {
            variations.append(contentsOf: translated.map { $0.lowercased() })
        }
        return variations
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Lib/ClassificationEngine.swift
git commit -m "feat(ios): add classification engine for calendar events"
```

---

### Task 3: CalendarImportViewModel

**Files:**
- Create: `apps/ios/Seder/Seder/ViewModels/CalendarImportViewModel.swift`

**Step 1: Create the ViewModel**

```swift
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
            let settings: UserSettings = try await api.request(
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
        let body = SettingsUpdateRequest(
            calendarSettings: CalendarSettingsPayload(rules: rules)
        )
        do {
            let _: UserSettings = try await api.request(
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

struct UserSettings: Decodable {
    let calendarSettings: CalendarSettingsData?
}

struct CalendarSettingsData: Decodable {
    let rules: [ClassificationRule]?
    let selectedCalendarIds: [String]?
}

struct SettingsUpdateRequest: Encodable {
    let calendarSettings: CalendarSettingsPayload
}

struct CalendarSettingsPayload: Encodable {
    let rules: [ClassificationRule]
}
```

Note: `CreateIncomeRequest` already exists in `Models/IncomeEntry.swift` but needs `calendarEventId` field. We'll add it in a fixup.

**Step 2: Add `calendarEventId` to CreateIncomeRequest**

In `apps/ios/Seder/Seder/Models/IncomeEntry.swift`, add to `CreateIncomeRequest`:
```swift
var calendarEventId: String?
```

**Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/CalendarImportViewModel.swift
git add apps/ios/Seder/Seder/Models/IncomeEntry.swift
git commit -m "feat(ios): add CalendarImportViewModel with full import flow"
```

---

### Task 4: CalendarImportView — Step 1 (Calendar & Month Selection)

**Files:**
- Rewrite: `apps/ios/Seder/Seder/Views/Calendar/CalendarImportView.swift`

**Step 1: Rewrite the view**

```swift
import SwiftUI

struct CalendarImportView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = CalendarImportViewModel()
    @State private var importedCount: Int?
    var onImportComplete: (() -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.step {
                case .selectCalendar:
                    calendarSelectionStep
                case .preview:
                    EventPreviewView(viewModel: viewModel, onDone: { count in
                        importedCount = count
                        onImportComplete?()
                        dismiss()
                    })
                }
            }
            .navigationTitle(viewModel.step == .selectCalendar ? "ייבוא מהיומן" : "תצוגה מקדימה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .task { await viewModel.loadCalendars() }
    }

    // MARK: - Step 1: Calendar Selection

    private var calendarSelectionStep: some View {
        VStack(spacing: 20) {
            Text("בחר חודש ויומנים לייבוא אירועים")
                .font(SederTheme.ploni(16))
                .foregroundStyle(SederTheme.textSecondary)
                .padding(.top, 8)

            // Calendars
            VStack(alignment: .leading, spacing: 8) {
                Text("יומנים")
                    .font(SederTheme.ploni(16, weight: .semibold))
                    .foregroundStyle(SederTheme.textSecondary)

                if viewModel.isLoading && viewModel.calendars.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    ForEach(viewModel.calendars) { cal in
                        Button { viewModel.toggleCalendar(cal.id) } label: {
                            HStack {
                                Text(cal.summary)
                                    .font(SederTheme.ploni(18))
                                    .foregroundStyle(SederTheme.textPrimary)
                                Spacer()
                                Image(systemName: viewModel.selectedCalendarIds.contains(cal.id) ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(viewModel.selectedCalendarIds.contains(cal.id) ? SederTheme.brandGreen : SederTheme.textTertiary)
                                    .font(.system(size: 20))
                            }
                            .padding(12)
                            .background(SederTheme.cardBg)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(SederTheme.cardBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }

            // Month picker
            MonthPicker(selectedDate: $viewModel.selectedMonth)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(SederTheme.ploni(14))
                    .foregroundStyle(.red)
            }

            Spacer()

            // Next button
            Button {
                Task { await viewModel.fetchAndClassifyEvents() }
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                } else {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                        Text("המשך")
                            .font(SederTheme.ploni(18, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(SederTheme.brandGreen)
            .disabled(viewModel.isLoading || viewModel.selectedCalendarIds.isEmpty)

            Button { dismiss() } label: {
                Text("ביטול")
                    .font(SederTheme.ploni(16))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .padding(16)
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Calendar/CalendarImportView.swift
git commit -m "feat(ios): rewrite CalendarImportView with calendar selection step"
```

---

### Task 5: EventPreviewView — Step 2

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Calendar/EventPreviewView.swift`

**Step 1: Create the preview view**

```swift
import SwiftUI

struct EventPreviewView: View {
    @ObservedObject var viewModel: CalendarImportViewModel
    var onDone: (Int) -> Void
    @State private var showRulesManager = false

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                // Settings button (left in RTL)
                Button { showRulesManager = true } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 16))
                        .foregroundStyle(SederTheme.textSecondary)
                }

                Spacer()

                // Action buttons (right in RTL)
                HStack(spacing: 12) {
                    Button { viewModel.selectAllWork() } label: {
                        Text("בחר הכל עבודה (\(viewModel.workCount))")
                            .font(SederTheme.ploni(13, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                    }

                    Button { viewModel.clearSelection() } label: {
                        Text("נקה בחירה")
                            .font(SederTheme.ploni(13, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }

                    Button { viewModel.hidePersonal.toggle() } label: {
                        HStack(spacing: 4) {
                            Text(viewModel.hidePersonal ? "הצג הכל" : "הסתר אישי")
                                .font(SederTheme.ploni(13, weight: .medium))
                            Image(systemName: viewModel.hidePersonal ? "eye.slash" : "eye")
                                .font(.system(size: 12))
                        }
                        .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            Divider()

            // Events list
            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(viewModel.displayedEvents) { item in
                        EventRow(item: item) {
                            viewModel.toggleEvent(item.id)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
            }

            Divider()

            // Footer
            VStack(spacing: 8) {
                Button {
                    Task {
                        let count = await viewModel.importSelected()
                        onDone(count)
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("ייבא \(viewModel.selectedCount) אירועים")
                            .font(SederTheme.ploni(18, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(SederTheme.brandGreen)
                .disabled(viewModel.selectedCount == 0 || viewModel.isLoading)

                Button {
                    viewModel.step = .selectCalendar
                } label: {
                    Text("חזרה")
                        .font(SederTheme.ploni(16))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .padding(16)
        }
        .sheet(isPresented: $showRulesManager) {
            RulesManagerView(viewModel: viewModel)
        }
    }
}

// MARK: - Event Row

struct EventRow: View {
    let item: ClassifiedEvent
    var onToggle: () -> Void

    private var badgeText: String {
        if item.event.alreadyImported { return "יובא" }
        return item.isWork ? "עבודה" : "אישי"
    }

    private var badgeColor: Color {
        if item.event.alreadyImported { return .blue }
        return item.isWork ? SederTheme.paidColor : .red
    }

    private var dateString: String {
        // Parse ISO date and format nicely
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: item.event.start) else {
            return String(item.event.start.prefix(10))
        }
        let df = DateFormatter()
        df.locale = Locale(identifier: "he")
        df.dateFormat = "d בMMMM • HH:mm"
        return df.string(from: date)
    }

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 10) {
                // Checkbox (left in RTL)
                Image(systemName: item.event.alreadyImported ? "checkmark.square.fill" : item.selected ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20))
                    .foregroundStyle(
                        item.event.alreadyImported ? .blue.opacity(0.5) :
                        item.selected ? SederTheme.brandGreen : SederTheme.textTertiary
                    )

                Spacer()

                // Event info (right in RTL)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(item.event.summary)
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textPrimary)
                            .lineLimit(1)

                        Text(badgeText)
                            .font(SederTheme.ploni(11, weight: .medium))
                            .foregroundStyle(badgeColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(badgeColor.opacity(0.1))
                            .clipShape(Capsule())
                    }

                    Text(dateString)
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(SederTheme.textSecondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(item.selected ? SederTheme.brandGreen.opacity(0.05) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .disabled(item.event.alreadyImported)
        .buttonStyle(.plain)
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Calendar/EventPreviewView.swift
git commit -m "feat(ios): add event preview view with classification badges"
```

---

### Task 6: RulesManagerView — Step 3

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Calendar/RulesManagerView.swift`

**Step 1: Create the rules manager view**

```swift
import SwiftUI

struct RulesManagerView: View {
    @ObservedObject var viewModel: CalendarImportViewModel
    @Environment(\.dismiss) var dismiss
    @State private var activeTab = "work"
    @State private var newKeyword = ""

    private var activeRuleIndex: Int? {
        viewModel.rules.firstIndex(where: {
            $0.type == activeTab && $0.matchType == "title"
        })
    }

    private var activeKeywords: [String] {
        guard let i = activeRuleIndex else { return [] }
        return viewModel.rules[i].keywords
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Tabs
                Picker("", selection: $activeTab) {
                    Text("אישי").tag("personal")
                    Text("עבודה").tag("work")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)

                // Keywords
                ScrollView {
                    FlowLayout(spacing: 8) {
                        ForEach(activeKeywords, id: \.self) { keyword in
                            HStack(spacing: 4) {
                                Button { removeKeyword(keyword) } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(SederTheme.textTertiary)
                                }
                                Text(keyword)
                                    .font(SederTheme.ploni(14))
                                    .foregroundStyle(SederTheme.textPrimary)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(SederTheme.cardBg)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(SederTheme.cardBorder, lineWidth: 1))
                        }
                    }
                    .padding(.horizontal, 16)
                }

                // Add keyword
                HStack {
                    Button { addKeyword() } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                    .disabled(newKeyword.trimmingCharacters(in: .whitespaces).isEmpty)

                    TextField("הוסף מילת מפתח...", text: $newKeyword)
                        .font(SederTheme.ploni(16))
                        .multilineTextAlignment(.leading)
                        .onSubmit { addKeyword() }
                }
                .padding(12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(SederTheme.cardBorder, lineWidth: 1))
                .padding(.horizontal, 16)

                // Reset button
                Button {
                    viewModel.rules = ClassificationEngine.defaultRules
                } label: {
                    Text("איפוס לברירת מחדל")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(.red)
                }

                Spacer()
            }
            .padding(.top, 8)
            .navigationTitle("כללי סינון")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task {
                            await viewModel.saveRules()
                            dismiss()
                        }
                    } label: {
                        Text("שמירה")
                            .font(SederTheme.ploni(16, weight: .semibold))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func addKeyword() {
        let keyword = newKeyword.trimmingCharacters(in: .whitespaces)
        guard !keyword.isEmpty, let i = activeRuleIndex else { return }
        if !viewModel.rules[i].keywords.contains(keyword) {
            viewModel.rules[i].keywords.append(keyword)
        }
        newKeyword = ""
    }

    private func removeKeyword(_ keyword: String) {
        guard let i = activeRuleIndex else { return }
        viewModel.rules[i].keywords.removeAll { $0 == keyword }
    }
}

// MARK: - Flow Layout (for keyword badges)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Calendar/RulesManagerView.swift
git commit -m "feat(ios): add rules manager for calendar classification"
```

---

### Task 7: Wire Up & Integration

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift`

**Step 1: Update CalendarImportView sheet to pass reload callback**

In `IncomeListView.swift`, update the `.sheet(isPresented: $showCalendarImport)`:

```swift
.sheet(isPresented: $showCalendarImport) {
    CalendarImportView(onImportComplete: {
        Task { await viewModel.loadEntries() }
    })
}
```

**Step 2: Verify Lib/ directory exists**

```bash
mkdir -p apps/ios/Seder/Seder/Lib
```

**Step 3: Add all new files to Xcode project**

Make sure these files are added to the Xcode project's file navigator (they should auto-detect if in the right folder structure).

**Step 4: Build and test**

Test the full flow:
1. Tap calendar import button
2. See calendar list, select calendars
3. Pick month, tap "המשך"
4. See classified events with badges
5. Toggle events, tap "ייבא X אירועים"
6. Verify entries appear in income list

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ios): wire up multi-step calendar import flow"
```

---

### Task 8: Cleanup Old Code

**Step 1: Remove old CalendarImportView contents**

The old file is fully replaced in Task 4. Verify no references to the old `importEvents()` function remain.

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore(ios): clean up old calendar import code"
```
