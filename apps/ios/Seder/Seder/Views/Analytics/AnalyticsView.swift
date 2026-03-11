import SwiftUI

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    @EnvironmentObject private var appState: AppState

    @State private var showMonthPicker = false
    @State private var showYearPicker = false

    private let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                          "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

    var body: some View {
        VStack(spacing: 0) {
            // Green navbar
            HStack {
                Spacer()
                Text("דוחות")
                    .font(SederTheme.ploni(17, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
            }
            .padding(.vertical, 12)
            .padding(.top, UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first?.safeAreaInsets.top ?? 0)
            .background(SederTheme.brandGreen.ignoresSafeArea(edges: .top))
            .environment(\.layoutDirection, .leftToRight)

            if viewModel.isLoading {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                        .tint(SederTheme.brandGreen)
                    Text("טוען נתונים...")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textSecondary)
                }
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        // Month selector
                        monthSelector

                        if !viewModel.hasData && !viewModel.kpiError {
                            // Empty month state
                            VStack(spacing: 8) {
                                Image(systemName: "chart.bar.xaxis")
                                    .font(.largeTitle)
                                    .foregroundStyle(SederTheme.textTertiary)
                                Text("אין נתונים לתקופה זו")
                                    .font(SederTheme.ploni(15))
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                            .padding(.top, 60)
                        } else {
                            // KPI Grid
                            if let agg = viewModel.aggregates {
                                ReportsKPIGrid(aggregates: agg)
                            }

                            // Expandable sections
                            IncomeChartSection(
                                trends: viewModel.trends,
                                isExpanded: viewModel.isSectionExpanded(.incomeChart),
                                hasError: viewModel.trendsError,
                                onToggle: { viewModel.toggleSection(.incomeChart) },
                                onRetry: { Task { await viewModel.retrySection(.incomeChart) } },
                                onMonthTap: { month, year in
                                    appState.navigateToIncomeMonth(month: month, year: year)
                                }
                            )

                            InvoiceTrackingSection(
                                attention: viewModel.attention,
                                isExpanded: viewModel.isSectionExpanded(.invoiceTracking),
                                hasError: viewModel.attentionError,
                                onToggle: { viewModel.toggleSection(.invoiceTracking) },
                                onRetry: { Task { await viewModel.retrySection(.invoiceTracking) } },
                                onItemTap: { entryId in
                                    appState.navigateToEntry(id: entryId)
                                }
                            )

                            CategoryBreakdownSection(
                                categories: viewModel.categories,
                                isExpanded: viewModel.isSectionExpanded(.categoryBreakdown),
                                hasError: viewModel.categoriesError,
                                onToggle: { viewModel.toggleSection(.categoryBreakdown) },
                                onRetry: { Task { await viewModel.retrySection(.categoryBreakdown) } }
                            )

                            VATSummarySection(
                                aggregates: viewModel.aggregates,
                                isExpanded: viewModel.isSectionExpanded(.vatSummary),
                                hasError: viewModel.kpiError,
                                onToggle: { viewModel.toggleSection(.vatSummary) },
                                onRetry: { Task { await viewModel.retrySection(.vatSummary) } }
                            )
                        }

                        Spacer().frame(height: 40)
                    }
                }
                .safeAreaPadding(.horizontal, 12)
                .opacity(viewModel.isReloading ? 0.6 : 1)
                .animation(.easeInOut(duration: 0.15), value: viewModel.isReloading)
            }
        }
        .background(SederTheme.pageBg)
        .ignoresSafeArea(edges: .top)
        .task { await viewModel.loadAll() }
        .onChange(of: viewModel.selectedMonth) { _ in
            Task { await viewModel.loadAll() }
        }
    }

    // MARK: - Month Selector

    private var borderColor: Color { Color(.separator).opacity(0.3) }

    private var currentMonthIndex: Int {
        Calendar.current.component(.month, from: viewModel.selectedMonth)
    }

    private var currentYear: Int {
        Calendar.current.component(.year, from: viewModel.selectedMonth)
    }

    private var monthSelector: some View {
        HStack(spacing: 0) {
            // Center: Month picker with arrows
            HStack(spacing: 0) {
                Button {
                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: viewModel.selectedMonth)!
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 30, height: 36)
                        .environment(\.layoutDirection, .leftToRight)
                }

                Button { showMonthPicker.toggle() } label: {
                    Text(months[currentMonthIndex - 1])
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textPrimary)
                        .lineLimit(1)
                        .fixedSize()
                        .frame(minWidth: 100)
                }
                .popover(isPresented: $showMonthPicker, arrowEdge: .top) {
                    monthPickerList
                        .presentationCompactAdaptation(.popover)
                }

                Button {
                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: viewModel.selectedMonth)!
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 30, height: 36)
                        .environment(\.layoutDirection, .leftToRight)
                }
            }
            .padding(.horizontal, 2)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(borderColor, lineWidth: 1)
            )

            Spacer()

            // Physical right: Year
            Button { showYearPicker.toggle() } label: {
                Text(String(currentYear))
                    .font(SederTheme.ploni(15))
                    .foregroundStyle(SederTheme.textPrimary)
                    .lineLimit(1)
                    .fixedSize()
                    .frame(height: 36)
                    .padding(.horizontal, 12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(borderColor, lineWidth: 1)
                    )
            }
            .popover(isPresented: $showYearPicker, arrowEdge: .top) {
                yearPickerList
                    .presentationCompactAdaptation(.popover)
            }
        }
        .padding(.leading, 10)
        .padding(.trailing, 16)
        .padding(.vertical, 8)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
    }

    private var monthPickerList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(0..<12, id: \.self) { i in
                    let monthNum = i + 1
                    let isCurrent = currentMonthIndex == monthNum

                    Button {
                        var components = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
                        components.month = monthNum
                        if let newDate = Calendar.current.date(from: components) {
                            viewModel.selectedMonth = newDate
                        }
                        showMonthPicker = false
                    } label: {
                        HStack(spacing: 10) {
                            Text(months[i])
                                .font(SederTheme.ploni(16, weight: isCurrent ? .semibold : .regular))
                                .foregroundStyle(SederTheme.textPrimary)
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 11)
                        .background(isCurrent ? SederTheme.subtleBg : Color.clear)
                    }

                    if i < 11 {
                        Divider().padding(.horizontal, 12)
                    }
                }
            }
            .padding(.vertical, 8)
        }
        .frame(width: 180, height: 400)
        .environment(\.layoutDirection, .rightToLeft)
    }

    private var yearPickerList: some View {
        let thisYear = Calendar.current.component(.year, from: Date())
        let years = Array((thisYear - 3)...(thisYear + 1))

        return VStack(spacing: 0) {
            ForEach(years, id: \.self) { year in
                Button {
                    var components = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
                    components.year = year
                    if let newDate = Calendar.current.date(from: components) {
                        viewModel.selectedMonth = newDate
                    }
                    showYearPicker = false
                } label: {
                    Text(String(year))
                        .font(.system(size: 16, weight: currentYear == year ? .semibold : .regular, design: .rounded).monospacedDigit())
                        .foregroundStyle(SederTheme.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(currentYear == year ? SederTheme.subtleBg : Color.clear)
                }

                if year != years.last {
                    Divider().padding(.horizontal, 12)
                }
            }
        }
        .padding(.vertical, 8)
        .frame(width: 120)
    }
}
