import SwiftUI
import Charts

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()

    private let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                          "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

    var body: some View {
        VStack(spacing: 0) {
            // Green navbar
            HStack {
                Spacer()
                Text("דוחות")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            .padding(.vertical, 12)
            .background(SederTheme.brandGreen)

            ScrollView {
                VStack(spacing: 12) {
                    // Month picker (filter bar style)
                    HStack(spacing: 8) {
                        Text("\(Calendar.current.component(.year, from: viewModel.selectedMonth))")
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(SederTheme.slate200, lineWidth: 1)
                            )

                        HStack(spacing: 8) {
                            Button {
                                viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: viewModel.selectedMonth)!
                            } label: {
                                Image(systemName: "chevron.left")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(SederTheme.slate500)
                            }

                            Text(months[Calendar.current.component(.month, from: viewModel.selectedMonth) - 1])
                                .font(.subheadline.weight(.medium))

                            Button {
                                viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: viewModel.selectedMonth)!
                            } label: {
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(SederTheme.slate500)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(SederTheme.slate200, lineWidth: 1)
                        )

                        Spacer()
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 8)
                    .padding(.top, 8)

                    if viewModel.isLoading {
                        ProgressView()
                            .tint(SederTheme.brandGreen)
                            .padding(.top, 40)
                    } else if let agg = viewModel.aggregates {
                        // KPI Cards (2-col, matching web style)
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8)
                        ], spacing: 8) {
                            AnalyticsKPICard(title: "הכנסה ברוטו", amount: agg.totalGross, icon: "banknote")
                            AnalyticsKPICard(title: "עבודות", count: agg.jobsCount, icon: "briefcase", amountColor: SederTheme.draftColor)
                            AnalyticsKPICard(title: "לא שולם", amount: agg.totalUnpaid, icon: "clock", amountColor: SederTheme.sentColor)
                        }
                        .padding(.horizontal, 8)

                        // Trend
                        if agg.trend != 0 {
                            HStack(spacing: 4) {
                                Text("\(Int(abs(agg.trend)))% לעומת חודש קודם")
                                    .font(.caption)
                                    .foregroundStyle(SederTheme.slate500)
                                Image(systemName: agg.trend > 0 ? "arrow.up.right" : "arrow.down.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(agg.trend > 0 ? SederTheme.paidColor : SederTheme.unpaidColor)
                            }
                            .padding(.horizontal, 12)
                        }

                        // Chart
                        if !viewModel.trends.isEmpty {
                            VStack(alignment: .trailing, spacing: 8) {
                                Text("הכנסות לאורך זמן")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(SederTheme.slate800)
                                    .padding(.horizontal, 16)
                                    .padding(.top, 12)

                                Chart(viewModel.trends, id: \.month) { trend in
                                    BarMark(
                                        x: .value("חודש", trend.month),
                                        y: .value("סכום", 1)
                                    )
                                    .foregroundStyle(trendColor(trend.status))
                                    .cornerRadius(4)
                                }
                                .chartYAxis(.hidden)
                                .chartXAxis {
                                    AxisMarks { _ in
                                        AxisValueLabel()
                                            .font(.system(size: 10))
                                            .foregroundStyle(SederTheme.slate500)
                                    }
                                }
                                .frame(height: 120)
                                .padding(.horizontal, 16)
                                .padding(.bottom, 12)
                            }
                            .background(Color(.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(SederTheme.slate200.opacity(0.6), lineWidth: 1)
                            )
                            .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            .padding(.horizontal, 8)
                        }
                    }

                    Spacer().frame(height: 40)
                }
            }
            .background(SederTheme.pageBg)
        }
        .task { await viewModel.loadAll() }
        .onChange(of: viewModel.selectedMonth) { _ in
            Task { await viewModel.loadAll() }
        }
    }

    private func trendColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return SederTheme.paidColor
        case "has-unpaid": return SederTheme.sentColor
        default: return SederTheme.slate200
        }
    }
}

struct AnalyticsKPICard: View {
    let title: String
    var amount: Double? = nil
    var count: Int? = nil
    var icon: String = "banknote"
    var amountColor: Color? = nil

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            Text(title)
                .font(.caption)
                .foregroundStyle(SederTheme.slate500)
                .padding(.bottom, 6)

            if let amount {
                CurrencyText(
                    amount: amount,
                    font: .system(size: 22, weight: .bold, design: .rounded),
                    color: amountColor ?? SederTheme.slate800
                )
            } else if let count {
                Text("\(count)")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(amountColor ?? SederTheme.slate800)
            }

            Spacer()

            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(SederTheme.slate400)
                Spacer()
            }
        }
        .padding(12)
        .frame(height: 100)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.slate100, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
    }
}
