import SwiftUI

struct InvoiceTrackingSection: View {
    let attention: AttentionResponse?
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void
    let onItemTap: (String) -> Void // entry ID

    private var totalCount: Int {
        guard let s = attention?.summary else { return 0 }
        return s.drafts.count + s.sent.count + s.overdue.count
    }

    var body: some View {
        ExpandableSection(
            title: "מעקב חשבוניות",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry,
            badge: {
                if totalCount > 0 {
                    Text("\(totalCount) דורשות טיפול")
                        .font(SederTheme.ploni(13, weight: .medium))
                        .foregroundStyle(SederTheme.sentColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(SederTheme.sentColor.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        ) {
            if let attention {
                VStack(spacing: 0) {
                    if totalCount == 0 {
                        // Empty state
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(SederTheme.paidColor)
                            Text("הכל מטופל!")
                                .font(SederTheme.ploni(14, weight: .medium))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                        .padding(.vertical, 20)
                    } else {
                        // Summary counters
                        HStack(spacing: 0) {
                            SummaryCounter(label: "טיוטות", count: attention.summary.drafts.count, amount: attention.summary.drafts.amount, color: SederTheme.textSecondary)
                            Divider().frame(height: 44)
                            SummaryCounter(label: "נשלחו", count: attention.summary.sent.count, amount: attention.summary.sent.amount, color: SederTheme.sentColor)
                            Divider().frame(height: 44)
                            SummaryCounter(label: "באיחור", count: attention.summary.overdue.count, amount: attention.summary.overdue.amount, color: SederTheme.unpaidColor)
                        }
                        .padding(.vertical, 8)

                        Divider()

                        // Item list
                        ForEach(attention.items) { item in
                            Button {
                                onItemTap(item.id)
                            } label: {
                                AttentionItemRow(item: item)
                            }
                            .buttonStyle(.plain)

                            if item.id != attention.items.last?.id {
                                Divider().padding(.horizontal, 12)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct SummaryCounter: View {
    let label: String
    let count: Int
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(SederTheme.ploni(14))
                .foregroundStyle(SederTheme.textSecondary)
            Text("\(count)")
                .font(.system(size: 24, weight: .regular, design: .rounded))
                .foregroundStyle(color)
            CurrencyText(amount: amount, size: 13, color: SederTheme.textTertiary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct AttentionItemRow: View {
    let item: AttentionItem

    var body: some View {
        HStack {
            // Right side: client + description
            VStack(alignment: .leading, spacing: 2) {
                Text("\(item.clientName) — \(item.description)")
                    .font(SederTheme.ploni(15, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                    .lineLimit(1)
                Text(item.date)
                    .font(SederTheme.ploni(13))
                    .foregroundStyle(SederTheme.textTertiary)
            }

            Spacer()

            // Left side: amount + badge + chevron
            HStack(spacing: 6) {
                CurrencyText(amount: item.amountGross, size: 15, weight: .medium, color: SederTheme.textPrimary)

                StatusPill(status: item.status)

                Image(systemName: "chevron.left")
                    .font(.system(size: 10))
                    .foregroundStyle(SederTheme.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}

private struct StatusPill: View {
    let status: String

    private var label: String {
        switch status {
        case "draft": return "טיוטה"
        case "sent": return "נשלחה"
        case "overdue": return "באיחור"
        default: return status
        }
    }

    private var color: Color {
        switch status {
        case "draft": return SederTheme.textSecondary
        case "sent": return SederTheme.sentColor
        case "overdue": return SederTheme.unpaidColor
        default: return SederTheme.textSecondary
        }
    }

    var body: some View {
        Text(label)
            .font(SederTheme.ploni(12, weight: .medium))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
