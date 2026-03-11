import SwiftUI

struct ReportsKPIGrid: View {
    let aggregates: IncomeAggregates

    private var netIncome: Double {
        aggregates.totalGross - aggregates.vatTotal
    }

    private var averagePerJob: Double {
        aggregates.jobsCount > 0 ? aggregates.totalGross / Double(aggregates.jobsCount) : 0
    }

    var body: some View {
        let columns = [
            GridItem(.flexible(), spacing: 6),
            GridItem(.flexible(), spacing: 6),
            GridItem(.flexible(), spacing: 6),
        ]

        LazyVGrid(columns: columns, spacing: 6) {
            // Row 1
            KPICell(title: "הכנסה ברוטו", color: SederTheme.paidColor) {
                CurrencyText(amount: aggregates.totalGross, size: 22, color: SederTheme.paidColor)
            }
            KPICell(title: "נטו (אחרי מע\"מ)", color: SederTheme.brandGreen) {
                CurrencyText(amount: netIncome, size: 22, color: SederTheme.brandGreen)
            }
            KPICell(title: "לא שולם", color: SederTheme.sentColor) {
                CurrencyText(amount: aggregates.totalUnpaid, size: 22, color: SederTheme.sentColor)
            }

            // Row 2
            KPICell(title: "עבודות", color: SederTheme.draftColor) {
                Text("\(aggregates.jobsCount)")
                    .font(.system(size: 22, weight: .regular, design: .rounded))
                    .foregroundStyle(SederTheme.draftColor)
            }
            KPICell(title: "ממוצע לעבודה", color: SederTheme.textPrimary) {
                CurrencyText(amount: averagePerJob, size: 22, color: SederTheme.textPrimary)
            }
            trendCell
        }
    }

    private var trendCell: some View {
        let trend = aggregates.trend
        let isPositive = trend >= 0
        let arrow = isPositive ? "↑" : "↓"
        let color = isPositive ? SederTheme.paidColor : SederTheme.unpaidColor
        let value = "\(arrow) \(Int(abs(trend)))%"

        return KPICell(title: "מגמה חודשית", color: color) {
            Text(value)
                .font(.system(size: 22, weight: .regular, design: .rounded))
                .foregroundStyle(color)
        }
    }
}

private struct KPICell<Content: View>: View {
    let title: String
    var color: Color = .primary
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(SederTheme.ploni(14))
                .foregroundStyle(SederTheme.textSecondary)

            content()
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
    }
}
