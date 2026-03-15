import Charts
import SwiftUI

struct ClientPieChartSection: View {
    let clients: [ClientBreakdown]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    @State private var selectedClientName: String?

    private let sliceColors: [Color] = [
        SederTheme.brandGreen,
        SederTheme.color(hex: "#3B82F6"),
        SederTheme.color(hex: "#F59E0B"),
        SederTheme.color(hex: "#EF4444"),
        SederTheme.color(hex: "#8B5CF6"),
        SederTheme.color(hex: "#9CA3AF"),
    ]

    private var selectedClient: (index: Int, client: ClientBreakdown)? {
        guard let name = selectedClientName else { return nil }
        guard let idx = clients.firstIndex(where: { $0.clientName == name }) else { return nil }
        return (idx, clients[idx])
    }

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
                    // Donut pie chart with tap tooltip
                    ZStack {
                        Chart(clients) { client in
                            SectorMark(
                                angle: .value("סכום", client.amount),
                                innerRadius: .ratio(0.55),
                                angularInset: 1.5
                            )
                            .foregroundStyle(by: .value("לקוח", client.clientName))
                            .cornerRadius(3)
                            .opacity(selectedClientName == nil || selectedClientName == client.clientName ? 1 : 0.4)
                        }
                        .chartLegend(.hidden)
                        .chartForegroundStyleScale(
                            domain: clients.map(\.clientName),
                            mapping: { name in
                                guard let idx = clients.firstIndex(where: { $0.clientName == name }) else {
                                    return sliceColors.last!
                                }
                                return sliceColors[idx % sliceColors.count]
                            }
                        )
                        .chartAngleSelection(value: $selectedClientName)

                        // Center tooltip
                        if let selected = selectedClient {
                            VStack(spacing: 2) {
                                Text(selected.client.clientName)
                                    .font(SederTheme.ploni(13, weight: .semibold))
                                    .foregroundStyle(SederTheme.textPrimary)
                                    .lineLimit(1)
                                CurrencyText(amount: selected.client.amount, size: 12, color: SederTheme.textSecondary)
                                Text("\(Int(selected.client.percentage))%")
                                    .font(SederTheme.ploni(11))
                                    .foregroundStyle(SederTheme.textTertiary)
                            }
                            .allowsHitTesting(false)
                            .transition(.opacity)
                        }
                    }
                    .frame(height: 180)
                    .padding(.top, 4)
                    .sensoryFeedback(.selection, trigger: selectedClientName)

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
