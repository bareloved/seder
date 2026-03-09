import SwiftUI

struct EventPreviewView: View {
    @ObservedObject var viewModel: CalendarImportViewModel
    var onDone: (Int) -> Void
    @State private var showRulesManager = false

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar — RTL: first = right
            HStack {
                HStack(spacing: 12) {
                    Button { viewModel.selectAllWork() } label: {
                        Text("בחר הכל עבודה (\(viewModel.workCount))")
                            .font(SederTheme.ploni(15, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                    }

                    Button { viewModel.clearSelection() } label: {
                        Text("נקה בחירה")
                            .font(SederTheme.ploni(15, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }

                    Button { viewModel.hidePersonal.toggle() } label: {
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.hidePersonal ? "eye.slash" : "eye")
                                .font(.system(size: 12))
                            Text(viewModel.hidePersonal ? "הצג הכל" : "הסתר אישי")
                                .font(SederTheme.ploni(15, weight: .medium))
                        }
                        .foregroundStyle(SederTheme.textSecondary)
                    }
                }

                Spacer()

                Button { showRulesManager = true } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 16))
                        .foregroundStyle(SederTheme.textSecondary)
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
                        .font(SederTheme.ploni(18))
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
                // Event info — first = right in RTL
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(badgeText)
                            .font(SederTheme.ploni(13, weight: .medium))
                            .foregroundStyle(badgeColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(badgeColor.opacity(0.1))
                            .clipShape(Capsule())

                        Text(item.event.summary)
                            .font(SederTheme.ploni(18))
                            .foregroundStyle(SederTheme.textPrimary)
                            .lineLimit(1)
                    }

                    Text(dateString)
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textSecondary)
                }

                Spacer()

                // Checkbox — last = left in RTL
                Image(systemName: item.event.alreadyImported ? "checkmark.square.fill" : item.selected ? "checkmark.square.fill" : "square")
                    .font(.system(size: 22))
                    .foregroundStyle(
                        item.event.alreadyImported ? .blue.opacity(0.5) :
                        item.selected ? SederTheme.brandGreen : SederTheme.textTertiary
                    )
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
