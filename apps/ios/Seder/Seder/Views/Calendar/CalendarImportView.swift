import SwiftUI

struct CalendarImportView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = CalendarImportViewModel()
    @State private var importedCount: Int?
    @State private var showCalendarPicker = false
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

    // MARK: - Calendar summary text

    private var calendarSummary: String {
        let selected = viewModel.calendars.filter { viewModel.selectedCalendarIds.contains($0.id) }
        if selected.isEmpty { return "לא נבחרו יומנים" }
        if selected.count == 1 { return selected[0].summary }
        return "\(selected[0].summary) +\(selected.count - 1)"
    }

    private let hebrewMonths = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ]

    private var yearOptions: [String] {
        let thisYear = Calendar.current.component(.year, from: Date())
        return (thisYear - 3 ... thisYear + 1).map { String($0) }
    }

    // MARK: - Step 1

    private var calendarSelectionStep: some View {
        VStack(spacing: 0) {
            Spacer()

            // Hero icon
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 56))
                .foregroundStyle(SederTheme.brandGreen)
                .padding(.bottom, 12)

            Text("ייבוא אירועים מהיומן")
                .font(SederTheme.ploni(22, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)
                .padding(.bottom, 4)

            Text("בחר חודש ויומנים לייבוא")
                .font(SederTheme.ploni(15))
                .foregroundStyle(SederTheme.textSecondary)
                .padding(.bottom, 28)

            // Settings rows
            VStack(spacing: 0) {
                // Calendar picker row — first = right in RTL
                Button { showCalendarPicker = true } label: {
                    HStack {
                        Text("יומנים")
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textPrimary)

                        Spacer()

                        Text(calendarSummary)
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                            .lineLimit(1)

                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                    .padding(14)
                }

                Divider().padding(.horizontal, 14)

                // Month + Year pickers
                HStack(spacing: 12) {
                    // Year picker — first = right in RTL, but we want month on right
                    // so year goes second (left in RTL)
                    dateDropdown(
                        label: "חודש",
                        value: hebrewMonths[Calendar.current.component(.month, from: viewModel.selectedMonth) - 1],
                        options: hebrewMonths,
                        onSelect: { idx in
                            var comps = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
                            comps.month = idx + 1
                            if let d = Calendar.current.date(from: comps) { viewModel.selectedMonth = d }
                        }
                    )

                    dateDropdown(
                        label: "שנה",
                        value: String(Calendar.current.component(.year, from: viewModel.selectedMonth)),
                        options: yearOptions,
                        onSelect: { idx in
                            let year = Calendar.current.component(.year, from: Date()) - 3 + idx
                            var comps = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
                            comps.year = year
                            if let d = Calendar.current.date(from: comps) { viewModel.selectedMonth = d }
                        }
                    )
                }
                .padding(14)
            }
            .background(SederTheme.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(SederTheme.ploni(14))
                    .foregroundStyle(.red)
                    .padding(.top, 12)
            }

            Spacer()
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
                        Text("המשך")
                            .font(SederTheme.ploni(18, weight: .semibold))
                        Image(systemName: "calendar")
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(SederTheme.brandGreen)
            .disabled(viewModel.isLoading || viewModel.selectedCalendarIds.isEmpty)
        }
        .padding(16)
        .sheet(isPresented: $showCalendarPicker) {
            CalendarPickerSheet(viewModel: viewModel)
        }
    }

    // MARK: - Date Dropdown

    private func dateDropdown(label: String, value: String, options: [String], onSelect: @escaping (Int) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(SederTheme.ploni(14, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            Menu {
                ForEach(Array(options.enumerated()), id: \.offset) { idx, option in
                    Button {
                        onSelect(idx)
                    } label: {
                        if option == value {
                            Label(option, systemImage: "checkmark")
                        } else {
                            Text(option)
                        }
                    }
                }
            } label: {
                HStack {
                    Text(value)
                        .font(SederTheme.ploni(16))
                        .foregroundStyle(SederTheme.textPrimary)

                    Spacer()

                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
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

// MARK: - Calendar Picker Sub-Sheet

struct CalendarPickerSheet: View {
    @ObservedObject var viewModel: CalendarImportViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.calendars) { cal in
                    let isSelected = viewModel.selectedCalendarIds.contains(cal.id)
                    let calColor = SederTheme.color(hex: cal.backgroundColor ?? "#4285f4")
                    Button { viewModel.toggleCalendar(cal.id) } label: {
                        HStack {
                            Text(cal.summary)
                                .font(SederTheme.ploni(18))
                                .foregroundStyle(SederTheme.textPrimary)

                            Spacer()

                            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 24))
                                .foregroundStyle(calColor)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("בחירת יומנים")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Text("סיום")
                            .font(SederTheme.ploni(16, weight: .semibold))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .presentationDetents([.medium])
    }
}
