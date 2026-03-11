import Charts
import SwiftUI

struct IncomeChartSection: View {
    let trends: [EnhancedMonthTrend]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "הכנסות לאורך זמן",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry
        ) {
            VStack(spacing: 8) {
                if trends.isEmpty {
                    Text("אין נתונים")
                        .font(.caption)
                        .foregroundStyle(SederTheme.textTertiary)
                        .padding(.vertical, 20)
                } else {
                    Chart(trends) { trend in
                        BarMark(
                            x: .value("חודש", AmountFormatter.monthName(trend.month)),
                            y: .value("סכום", trend.totalGross)
                        )
                        .foregroundStyle(barColor(trend.status))
                        .cornerRadius(4)
                    }
                    .chartYAxis(.hidden)
                    .chartXAxis {
                        AxisMarks { _ in
                            AxisValueLabel()
                                .font(.system(size: 9))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                    }
                    .frame(height: 120)

                    // Amount labels below chart
                    HStack(spacing: 0) {
                        ForEach(trends) { trend in
                            Text(AmountFormatter.abbreviated(trend.totalGross))
                                .font(.system(size: 8, weight: .semibold, design: .rounded))
                                .foregroundStyle(SederTheme.textSecondary)
                                .frame(maxWidth: .infinity)
                        }
                    }

                    // Legend
                    HStack(spacing: 12) {
                        LegendDot(color: SederTheme.paidColor, label: "שולם")
                        LegendDot(color: SederTheme.sentColor, label: "חלקי")
                    }
                    .padding(.top, 4)
                }
            }
            .padding(12)
        }
    }

    private func barColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return SederTheme.paidColor
        case "has-unpaid": return SederTheme.sentColor
        default: return SederTheme.subtleBg
        }
    }
}

private struct LegendDot: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(SederTheme.textSecondary)
        }
    }
}
