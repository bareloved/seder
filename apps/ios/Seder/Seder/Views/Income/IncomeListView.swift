import SwiftUI

struct IncomeListView: View {
    @StateObject private var viewModel = IncomeViewModel()
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddSheet = false
    @State private var showSettings = false
    @State private var showCalendarImport = false

    private var totalGross: Double {
        viewModel.entries.reduce(0) { $0 + $1.grossAmount }
    }
    private var totalPaid: Double {
        viewModel.entries.filter { $0.paymentStatus == .paid }.reduce(0) { $0 + $1.grossAmount }
    }
    private var totalUnpaid: Double {
        viewModel.entries.filter { $0.paymentStatus != .paid }.reduce(0) { $0 + $1.grossAmount }
    }
    private var readyToInvoice: Double {
        viewModel.entries.filter { $0.invoiceStatus == .draft }.reduce(0) { $0 + $1.grossAmount }
    }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Green navbar
                GreenNavBar(
                    onSettingsTap: { showSettings = true },
                    onCalendarTap: { showCalendarImport = true }
                )

                ScrollView {
                    VStack(spacing: 8) {
                        // KPI Cards (2x2 grid)
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8)
                        ], spacing: 8) {
                            KPICard(
                                title: "סה״כ \(currentMonthName)",
                                amount: totalGross,
                                icon: "calendar",
                                isHighlighted: true
                            )
                            KPICard(
                                title: "לפני חיוב",
                                amount: readyToInvoice,
                                icon: "doc.text"
                            )
                            KPICard(
                                title: "מחכה לתשלום",
                                amount: totalUnpaid,
                                icon: "doc.plaintext",
                                iconColor: SederTheme.sentColor
                            )
                            KPICard(
                                title: "התקבל החודש",
                                amount: totalPaid,
                                icon: "arrow.up.right",
                                amountColor: SederTheme.paidColor,
                                iconColor: SederTheme.paidColor
                            )
                        }
                        .padding(.horizontal, 8)
                        .padding(.top, 8)

                        // Filter bar
                        FilterBar(
                            selectedMonth: $viewModel.selectedMonth,
                            hasUnpaid: totalUnpaid > 0,
                            onCalendarTap: { showCalendarImport = true }
                        )
                        .padding(.horizontal, 8)

                        // Entries
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(SederTheme.brandGreen)
                                .padding(.top, 40)
                        } else if viewModel.entries.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 40))
                                    .foregroundStyle(SederTheme.textTertiary)
                                Text("אין עבודות לחודש הזה")
                                    .font(SederTheme.ploni(17, weight: .semibold))
                                    .foregroundStyle(SederTheme.textPrimary)
                                Text("התחל על ידי הוספת עבודה חדשה")
                                    .font(SederTheme.ploni(14))
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                            .padding(.top, 60)
                        } else {
                            LazyVStack(spacing: 4) {
                                ForEach(viewModel.entries) { entry in
                                    IncomeEntryRow(
                                        entry: entry,
                                        onMarkSent: {
                                            Task { await viewModel.markSent(entry.id) }
                                        },
                                        onMarkPaid: {
                                            Task { await viewModel.markPaid(entry.id) }
                                        },
                                        onDelete: {
                                            Task { await viewModel.deleteEntry(entry.id) }
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal, 8)
                        }

                        Spacer().frame(height: 80)
                    }
                }
                .refreshable { await viewModel.loadEntries() }
                .background(SederTheme.pageBg)
            }
            .ignoresSafeArea(edges: .top)

            // Floating add button (physical bottom-right)
            VStack {
                Spacer()
                HStack {
                    Button { showAddSheet = true } label: {
                        Image(systemName: "plus")
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(SederTheme.brandGreen)
                            .clipShape(Circle())
                            .shadow(color: SederTheme.brandGreen.opacity(0.3), radius: 8, y: 4)
                    }
                    Spacer()
                }
                .padding(.leading, 16)
                .padding(.bottom, 16)
            }
        }
        .sheet(isPresented: $showAddSheet) {
            IncomeFormSheet(viewModel: viewModel)
        }
        .sheet(isPresented: $showCalendarImport) {
            CalendarImportView()
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(auth)
        }
        .task { await viewModel.loadEntries() }
        .onChange(of: viewModel.selectedMonth) { _ in
            Task { await viewModel.loadEntries() }
        }
    }

    private var currentMonthName: String {
        let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
        let month = Calendar.current.component(.month, from: viewModel.selectedMonth)
        return months[month - 1]
    }
}

// MARK: - Green Nav Bar (LTR internal layout - physical positioning)

struct GreenNavBar: View {
    var onSettingsTap: () -> Void
    var onCalendarTap: () -> Void

    var body: some View {
        HStack {
            // Physical right: avatar + dark mode
            HStack(spacing: 12) {
                Button(action: onSettingsTap) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.9))
                }

                Button {} label: {
                    Image(systemName: "moon.fill")
                        .font(.body)
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 32, height: 32)
                        .background(.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }

            Spacer()

            // Physical left: calendar icon
            Button(action: onCalendarTap) {
                Image(systemName: "calendar.badge.clock")
                    .font(.title3)
                    .foregroundStyle(.white)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0)
        .background(SederTheme.brandGreen.ignoresSafeArea(edges: .top))
    }
}

// MARK: - Filter Bar

struct FilterBar: View {
    @Binding var selectedMonth: Date
    var hasUnpaid: Bool
    var onCalendarTap: () -> Void

    private let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                          "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

    var body: some View {
        HStack(spacing: 8) {
            // Filter button (physical left)
            Button {} label: {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                    .frame(width: 36, height: 36)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                    )
            }

            // Calendar import button
            Button(action: onCalendarTap) {
                Image(systemName: "calendar.badge.plus")
                    .font(.body)
                    .foregroundStyle(.blue)
                    .frame(width: 36, height: 36)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                    )
            }

            Spacer()

            // Month picker (physical right)
            HStack(spacing: 8) {
                Button {
                    selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)!
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                }

                HStack(spacing: 6) {
                    Text(months[Calendar.current.component(.month, from: selectedMonth) - 1])
                        .font(SederTheme.ploni(15, weight: .medium))
                        .foregroundStyle(SederTheme.textPrimary)
                    Circle()
                        .fill(hasUnpaid ? Color.red : SederTheme.paidColor)
                        .frame(width: 6, height: 6)
                }

                Button {
                    selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: selectedMonth)!
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )

            // Year
            Text("\(Calendar.current.component(.year, from: selectedMonth))")
                .font(SederTheme.ploni(14))
                .foregroundStyle(SederTheme.textPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - KPI Card
// In RTL: .leading = physical RIGHT, first HStack item = physical RIGHT

struct KPICard: View {
    let title: String
    let amount: Double
    var icon: String = "banknote"
    var isHighlighted: Bool = false
    var amountColor: Color? = nil
    var iconColor: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title (physical right in RTL via .leading)
            Text(title)
                .font(SederTheme.ploni(12))
                .foregroundStyle(SederTheme.textSecondary)
                .padding(.bottom, 6)

            // Amount (physical right in RTL via .leading)
            CurrencyText(
                amount: amount,
                font: SederTheme.ploni(24, weight: .bold),
                color: amountColor ?? SederTheme.textPrimary
            )

            Spacer()

            // Icon on physical left (last in HStack = left in RTL)
            HStack {
                Spacer()
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(iconColor ?? SederTheme.textTertiary)
            }
        }
        .padding(12)
        .frame(height: 100)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(
                    isHighlighted ? SederTheme.textPrimary.opacity(0.3) : SederTheme.cardBorder,
                    lineWidth: isHighlighted ? 1.5 : 1
                )
        )
        .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
    }
}
