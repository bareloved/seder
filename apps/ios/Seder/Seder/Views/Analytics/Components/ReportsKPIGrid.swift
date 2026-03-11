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
            KPICell(title: "הכנסה ברוטו", value: AmountFormatter.full(aggregates.totalGross), color: SederTheme.paidColor)
            KPICell(title: "נטו (אחרי מע\"מ)", value: AmountFormatter.full(netIncome), color: SederTheme.brandGreen)
            KPICell(title: "לא שולם", value: AmountFormatter.full(aggregates.totalUnpaid), color: SederTheme.sentColor)

            // Row 2
            KPICell(title: "עבודות", value: "\(aggregates.jobsCount)", color: SederTheme.draftColor)
            KPICell(title: "ממוצע לעבודה", value: AmountFormatter.full(averagePerJob), color: SederTheme.textPrimary)
            trendCell
        }
    }

    private var trendCell: some View {
        let trend = aggregates.trend
        let isPositive = trend >= 0
        let arrow = isPositive ? "↑" : "↓"
        let color = isPositive ? SederTheme.paidColor : SederTheme.unpaidColor
        let value = "\(arrow) \(Int(abs(trend)))%"

        return KPICell(title: "מגמה חודשית", value: value, color: color)
    }
}

private struct KPICell: View {
    let title: String
    let value: String
    var color: Color = .primary

    var body: some View {
        VStack(alignment: .trailing, spacing: 3) {
            Text(title)
                .font(SederTheme.ploni(10))
                .foregroundStyle(SederTheme.textSecondary)

            Text(value)
                .font(SederTheme.ploni(16, weight: .bold))
                .foregroundStyle(color)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(8)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
    }
}
