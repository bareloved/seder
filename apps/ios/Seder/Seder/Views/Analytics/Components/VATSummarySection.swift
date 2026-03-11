import SwiftUI

struct VATSummarySection: View {
    let aggregates: IncomeAggregates?
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "דוח מע\"מ",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry,
            badge: {
                if let agg = aggregates, agg.vatTotal > 0 {
                    Text(AmountFormatter.full(agg.vatTotal))
                        .font(SederTheme.ploni(12, weight: .medium))
                        .foregroundStyle(.purple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.purple.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        ) {
            if let agg = aggregates {
                VStack(spacing: 0) {
                    VATRow(label: "הכנסה ברוטו", value: AmountFormatter.full(agg.totalGross), color: SederTheme.textPrimary)
                    Divider().padding(.horizontal, 12)
                    VATRow(label: "מע\"מ (18%)", value: "- \(AmountFormatter.full(agg.vatTotal))", color: SederTheme.unpaidColor)
                    Divider().padding(.horizontal, 12)
                    VATRow(label: "נטו לאחר מע\"מ", value: AmountFormatter.full(agg.totalGross - agg.vatTotal), color: SederTheme.paidColor, isBold: true)
                }
                .padding(.vertical, 4)
            }
        }
    }
}

private struct VATRow: View {
    let label: String
    let value: String
    var color: Color = .primary
    var isBold: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(SederTheme.ploni(16, weight: isBold ? .semibold : .regular))
                .foregroundStyle(isBold ? SederTheme.textPrimary : SederTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 18, weight: isBold ? .medium : .regular, design: .rounded))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }
}
