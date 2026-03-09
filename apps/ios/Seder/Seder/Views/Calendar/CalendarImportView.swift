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

                // Month row
                HStack {
                    Text("חודש")
                        .font(SederTheme.ploni(16))
                        .foregroundStyle(SederTheme.textPrimary)

                    Spacer()

                    MonthPicker(selectedDate: $viewModel.selectedMonth)
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
                                .font(SederTheme.ploni(16))
                                .foregroundStyle(SederTheme.textPrimary)

                            Spacer()

                            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 22))
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
