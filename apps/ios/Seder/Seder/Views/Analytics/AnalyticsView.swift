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
                            .padding(.top, 40)
                    } else if let agg = viewModel.aggregates {
                        // KPI Cards
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            KPICard(title: "הכנסה ברוטו", value: agg.totalGross)
                            KPICard(title: "שולם", value: agg.totalPaid)
                            KPICard(title: "לא שולם", value: agg.totalUnpaid)
                            KPICard(title: "מע״מ", value: agg.vatTotal)
                            KPICard(title: "ממתין לחשבונית", value: agg.readyToInvoice)
                            KPICard(title: "עבודות", value: Double(agg.jobsCount), isCurrency: false)
                        }
                        .padding(.horizontal)

                        // Trend indicator
                        if agg.trend != 0 {
                            HStack {
                                Image(systemName: agg.trend > 0 ? "arrow.up.right" : "arrow.down.right")
                                    .foregroundStyle(agg.trend > 0 ? .green : .red)
                                Text("\(Int(abs(agg.trend)))% לעומת חודש קודם")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal)
                        }

                        // Monthly trends chart
                        if !viewModel.trends.isEmpty {
                            VStack(alignment: .trailing) {
                                Text("סטטוס חודשי")
                                    .font(.headline)
                                    .padding(.horizontal)

                                Chart(viewModel.trends, id: \.month) { trend in
                                    BarMark(
                                        x: .value("חודש", trend.month),
                                        y: .value("סטטוס", 1)
                                    )
                                    .foregroundStyle(trendColor(trend.status))
                                }
                                .frame(height: 120)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
            }
            .navigationTitle("אנליטיקס")
            .task { await viewModel.loadAll() }
            .onChange(of: viewModel.selectedMonth) {
                Task { await viewModel.loadAll() }
            }
        }
    }

    private func trendColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return .green
        case "has-unpaid": return .orange
        default: return .gray.opacity(0.3)
        }
    }
}

struct KPICard: View {
    let title: String
    let value: Double
    var isCurrency: Bool = true

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            if isCurrency {
                CurrencyText(amount: value, font: .title3.bold())
            } else {
                Text("\(Int(value))")
                    .font(.title3.bold())
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
