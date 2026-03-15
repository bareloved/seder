import Charts
import SwiftUI

struct ClientPieChartSection: View {
    let clients: [ClientBreakdown]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    @State private var selectedIndex: Int?

    private let sliceColors: [Color] = [
        SederTheme.brandGreen,
        SederTheme.color(hex: "#3B82F6"),
        SederTheme.color(hex: "#F59E0B"),
        SederTheme.color(hex: "#EF4444"),
        SederTheme.color(hex: "#8B5CF6"),
        SederTheme.color(hex: "#9CA3AF"),
    ]

    /// Convert a tap angle (0...1 fraction of full circle) to a client index
    private func indexForFraction(_ fraction: Double) -> Int? {
        let totalAmount = clients.reduce(0.0) { $0 + $1.amount }
        guard totalAmount > 0 else { return nil }
        var cumulative = 0.0
        for (i, client) in clients.enumerated() {
            cumulative += client.amount / totalAmount
            if fraction <= cumulative {
                return i
            }
        }
        return nil
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
                    pieChart
                    legendList
                }
                .padding(12)
            }
        }
    }

    // MARK: - Donut Chart

    private var pieChart: some View {
        ZStack {
            Chart(Array(clients.enumerated()), id: \.element.id) { index, client in
                SectorMark(
                    angle: .value("סכום", client.amount),
                    innerRadius: .ratio(0.55),
                    angularInset: 1.5
                )
                .foregroundStyle(sliceColors[index % sliceColors.count])
                .cornerRadius(3)
                .opacity(selectedIndex == nil || selectedIndex == index ? 1.0 : 0.4)
            }
            .chartLegend(.hidden)
            .chartOverlay { proxy in
                GeometryReader { geo in
                    Rectangle().fill(Color.clear).contentShape(Rectangle())
                        .onTapGesture { location in
                            // Convert tap location to angle fraction
                            guard let plotFrame = proxy.plotFrame else { return }
                            let frame = geo[plotFrame]
                            let center = CGPoint(x: frame.midX, y: frame.midY)
                            let dx = location.x - center.x
                            let dy = location.y - center.y

                            // Check if tap is in the donut ring (not the hole or outside)
                            let distance = sqrt(dx * dx + dy * dy)
                            let outerRadius = min(frame.width, frame.height) / 2
                            let innerRadius = outerRadius * 0.55
                            guard distance >= innerRadius && distance <= outerRadius else {
                                // Tapped hole or outside — deselect
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    selectedIndex = nil
                                }
                                return
                            }

                            // atan2 gives angle from positive X axis, counter-clockwise
                            // Charts draws from top (12 o'clock), clockwise
                            var angle = atan2(dx, -dy) // 0 = top, increases clockwise
                            if angle < 0 { angle += 2 * .pi }
                            let fraction = angle / (2 * .pi)

                            withAnimation(.easeInOut(duration: 0.15)) {
                                let tapped = indexForFraction(fraction)
                                if tapped == selectedIndex {
                                    selectedIndex = nil // toggle off
                                } else {
                                    selectedIndex = tapped
                                }
                            }
                        }
                }
            }

            // Center tooltip
            if let idx = selectedIndex, idx < clients.count {
                let client = clients[idx]
                VStack(spacing: 2) {
                    Text(client.clientName)
                        .font(SederTheme.ploni(13, weight: .semibold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .lineLimit(1)
                    CurrencyText(amount: client.amount, size: 12, color: SederTheme.textSecondary)
                    Text("\(Int(client.percentage))%")
                        .font(SederTheme.ploni(11))
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .allowsHitTesting(false)
            }
        }
        .frame(height: 180)
        .padding(.top, 4)
    }

    // MARK: - Legend

    private var legendList: some View {
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
}
