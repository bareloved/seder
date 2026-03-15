import Charts
import SwiftUI

struct ClientPieChartSection: View {
    let clients: [ClientBreakdown]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    private let sliceColors: [Color] = [
        SederTheme.brandGreen,
        SederTheme.color(hex: "#3B82F6"),
        SederTheme.color(hex: "#F59E0B"),
        SederTheme.color(hex: "#EF4444"),
        SederTheme.color(hex: "#8B5CF6"),
        SederTheme.color(hex: "#9CA3AF"),
    ]

    var body: some View {
        ExpandableSection(
            title: "פילוח לפי לקוח",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry
        ) {
            if clients.isEmpty {
                Text("אין נתונים")
                    .font(SederTheme.ploni(14))
                    .foregroundStyle(SederTheme.textTertiary)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 12) {
                    // Donut pie chart
                    Chart(Array(clients.enumerated()), id: \.element.id) { index, client in
                        SectorMark(
                            angle: .value("סכום", client.amount),
                            innerRadius: .ratio(0.55),
                            angularInset: 1.5
                        )
                        .foregroundStyle(sliceColors[index % sliceColors.count])
                        .cornerRadius(3)
                    }
                    .chartLegend(.hidden)
                    .frame(height: 180)
                    .padding(.top, 4)

                    // Legend list
                    VStack(spacing: 6) {
                        ForEach(Array(clients.enumerated()), id: \.element.id) { index, client in
                            VStack(spacing: 4) {
                                HStack {
                                    Circle()
                                        .fill(sliceColors[index % sliceColors.count])
                                        .frame(width: 10, height: 10)

                                    Text(client.clientName)
                                        .font(SederTheme.ploni(14, weight: .medium))
                                        .foregroundStyle(SederTheme.textPrimary)
                                        .lineLimit(1)

                                    Spacer()

                                    HStack(spacing: 4) {
                                        CurrencyText(amount: client.amount, size: 13, color: SederTheme.textSecondary)
                                        Text("(\(Int(client.percentage))%)")
                                            .font(SederTheme.ploni(13))
                                            .foregroundStyle(SederTheme.textSecondary)
                                    }
                                }

                                if let monthly = client.monthlyAmounts {
                                    MiniSparkline(values: monthly)
                                        .padding(.leading, 20)
                                }
                            }
                        }
                    }
                }
                .padding(12)
            }
        }
    }
}
