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
