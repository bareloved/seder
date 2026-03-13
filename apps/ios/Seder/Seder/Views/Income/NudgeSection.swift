import SwiftUI

struct NudgeSection: View {
    @ObservedObject var viewModel: NudgeViewModel
    @State private var isExpanded = false

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
                    ForEach(viewModel.nudges) { nudge in
                        NudgeCard(nudge: nudge)
                            .swipeActions(edge: .leading) {
                                Button {
                                    viewModel.snooze(nudge)
                                } label: {
                                    Label("אח״כ", systemImage: "clock")
                                }
                                .tint(.blue)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    viewModel.dismiss(nudge)
                                } label: {
                                    Label("סגור", systemImage: "xmark")
                                }
                            }
                    }
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

    private var iconName: String {
        switch nudge.nudgeType {
        case "uninvoiced": return "doc.text"
        case "overdue_payment": return "creditcard"
        case "way_overdue": return "exclamationmark.triangle"
        case "partial_stale": return "creditcard"
        case "unlogged_calendar": return "calendar"
        case "month_end": return "clock"
        default: return "bell"
        }
    }

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
        HStack(spacing: 12) {
            // Icon
            Image(systemName: iconName)
                .foregroundColor(iconColor)
                .font(.system(size: 16))
                .frame(width: 32, height: 32)
                .background(iconColor.opacity(0.1))
                .cornerRadius(8)

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
