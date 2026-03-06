import SwiftUI
import Charts

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    MonthPicker(selectedDate: $viewModel.selectedMonth)
                        .padding(.top)

                    if viewModel.isLoading {
                        ProgressView()
                            .tint(SederTheme.brandGreen)
                            .padding(.top, 40)
                    } else if let agg = viewModel.aggregates {
                        // KPI Cards
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            KPICard(title: "הכנסה ברוטו", value: agg.totalGross,
                                    icon: "banknote", color: SederTheme.kpiGross)
                            KPICard(title: "שולם", value: agg.totalPaid,
                                    icon: "checkmark.seal", color: SederTheme.kpiPaid)
                            KPICard(title: "לא שולם", value: agg.totalUnpaid,
                                    icon: "clock", color: SederTheme.kpiUnpaid)
                            KPICard(title: "מע״מ", value: agg.vatTotal,
                                    icon: "percent", color: SederTheme.kpiVat)
                            KPICard(title: "ממתין לחשבונית", value: agg.readyToInvoice,
                                    icon: "doc.text", color: SederTheme.kpiInvoice)
                            KPICard(title: "עבודות", value: Double(agg.jobsCount),
                                    isCurrency: false, icon: "briefcase", color: SederTheme.kpiJobs)
                        }
                        .padding(.horizontal)

                        // Trend indicator
                        if agg.trend != 0 {
                            HStack(spacing: 6) {
                                Image(systemName: agg.trend > 0 ? "arrow.up.right" : "arrow.down.right")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(agg.trend > 0 ? SederTheme.paidColor : SederTheme.unpaidColor)
                                Text("\(Int(abs(agg.trend)))% לעומת חודש קודם")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background(
                                (agg.trend > 0 ? SederTheme.paidColor : SederTheme.unpaidColor).opacity(0.08)
                            )
                            .clipShape(Capsule())
                            .padding(.horizontal)
                        }

                        // Monthly trends chart
                        if !viewModel.trends.isEmpty {
                            VStack(alignment: .trailing, spacing: 12) {
                                Text("סטטוס חודשי")
                                    .font(.headline)
                                    .padding(.horizontal)

                                Chart(viewModel.trends, id: \.month) { trend in
                                    BarMark(
                                        x: .value("חודש", trend.month),
                                        y: .value("סטטוס", 1)
                                    )
                                    .foregroundStyle(trendColor(trend.status))
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                                .chartXAxis {
                                    AxisMarks { _ in
                                        AxisValueLabel()
                                            .font(.caption2)
                                    }
                                }
                                .chartYAxis(.hidden)
                                .frame(height: 100)
                                .padding(.horizontal)
                            }
                            .padding(.vertical, 16)
                            .background(Color(.systemGray6).opacity(0.5))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.bottom, 20)
            }
            .navigationTitle("אנליטיקס")
            .task { await viewModel.loadAll() }
            .onChange(of: viewModel.selectedMonth) { _ in
                Task { await viewModel.loadAll() }
            }
        }
    }

    private func trendColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return SederTheme.paidColor
        case "has-unpaid": return SederTheme.sentColor
        default: return Color(.systemGray4)
        }
    }
}

struct KPICard: View {
    let title: String
    let value: Double
    var isCurrency: Bool = true
    var icon: String = "banknote"
    var color: Color = .gray

    var body: some View {
        VStack(alignment: .trailing, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(color.opacity(0.6))
                Spacer()
                Text(title)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            if isCurrency {
                CurrencyText(amount: value, font: .system(.title3, design: .rounded).bold())
            } else {
                Text("\(Int(value))")
                    .font(.system(.title3, design: .rounded).bold())
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(14)
        .background(color.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
