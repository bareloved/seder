import SwiftUI

struct NudgeSection: View {
    @ObservedObject var viewModel: NudgeViewModel
    var onNavigateToEntry: ((Date, String?) -> Void)?
    @State private var isExpanded = false

    private static var daysUntilEndOfMonth: Int {
        let calendar = Calendar.current
        let today = Date()
        guard let endOfMonth = calendar.range(of: .day, in: .month, for: today)?.upperBound else {
            return 7
        }
        let currentDay = calendar.component(.day, from: today)
        return max(endOfMonth - 1 - currentDay, 1)
    }

    private func navigateToNudgeMonth(_ nudge: Nudge) {
        let calendar = Calendar.current
        let entryDate: Date

        if let dateStr = nudge.entryDate {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            if let parsed = formatter.date(from: dateStr) {
                entryDate = parsed
            } else {
                return
            }
        } else if let daysSince = nudge.daysSince {
            entryDate = calendar.date(byAdding: .day, value: -daysSince, to: Date()) ?? Date()
        } else {
            return
        }

        let components = calendar.dateComponents([.year, .month], from: entryDate)
        guard let monthDate = calendar.date(from: components) else { return }
        onNavigateToEntry?(monthDate, nudge.entryId)
    }

    var body: some View {
        if !viewModel.nudges.isEmpty {
            VStack(spacing: 0) {
                // Header
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                            .font(.system(size: 14))
                        Text("\(viewModel.nudges.count) פריטים דורשים טיפול")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .foregroundColor(.secondary)
                            .font(.system(size: 12))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }

                if isExpanded {
                    List {
                        ForEach(viewModel.nudges) { nudge in
                            NudgeCard(nudge: nudge)
                                .listRowInsets(EdgeInsets())
                                .listRowSeparator(.hidden)
                                .listRowBackground(Color.clear)
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        viewModel.snooze(nudge, days: 3)
                                    } label: {
                                        Label("3 ימים", systemImage: "clock")
                                    }
                                    .tint(.blue)

                                    Button {
                                        viewModel.snooze(nudge, days: 7)
                                    } label: {
                                        Label("שבוע", systemImage: "clock.badge")
                                    }
                                    .tint(.indigo)

                                    Button {
                                        viewModel.snooze(nudge, days: Self.daysUntilEndOfMonth)
                                    } label: {
                                        Label("סוף החודש", systemImage: "calendar")
                                    }
                                    .tint(.purple)
                                }
                                .swipeActions(edge: .trailing) {
                                    Button {
                                        navigateToNudgeMonth(nudge)
                                    } label: {
                                        Image(systemName: "arrow.right")
                                    }
                                    .tint(.green)
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollDisabled(true)
                    .frame(height: CGFloat(viewModel.nudges.count) * 56)
                }
            }
            .background(Color.orange.opacity(0.05))
            .cornerRadius(12)
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
    }
}

struct NudgeCard: View {
    let nudge: Nudge

    private var iconColor: Color {
        switch nudge.nudgeType {
        case "uninvoiced": return .blue
        case "overdue_payment": return .orange
        case "way_overdue": return .red
        case "partial_stale": return .orange
        case "unlogged_calendar": return .purple
        case "month_end": return .yellow
        default: return .gray
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(iconColor.opacity(0.5))
                .frame(width: 6, height: 6)

            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(nudge.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)
                Text(nudge.description)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}
