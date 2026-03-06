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
                // Green navbar (extends into status bar)
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
                        HStack(spacing: 8) {
                            // Year
                            Text(yearString)
                                .font(.subheadline)
                                .foregroundStyle(SederTheme.textPrimary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )

                            // Month picker
                            HStack(spacing: 8) {
                                Button {
                                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: viewModel.selectedMonth)!
                                } label: {
                                    Image(systemName: "chevron.left")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(SederTheme.textSecondary)
                                }

                                HStack(spacing: 6) {
                                    Text(monthName)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(SederTheme.textPrimary)
                                    Circle()
                                        .fill(totalUnpaid > 0 ? Color.red : SederTheme.paidColor)
                                        .frame(width: 6, height: 6)
                                }

                                Button {
                                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: viewModel.selectedMonth)!
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

                            Spacer()

                            // Calendar import button
                            Button { showCalendarImport = true } label: {
                                Image(systemName: "calendar.badge.plus")
                                    .font(.body)
                                    .foregroundStyle(.blue)
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                                    )
                            }

                            // Filter button
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
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
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
                                    .font(.headline)
                                    .foregroundStyle(SederTheme.textPrimary)
                                Text("התחל על ידי הוספת עבודה חדשה")
                                    .font(.subheadline)
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

            // Floating add button — use GeometryReader to force physical right side
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button { showAddSheet = true } label: {
                        Image(systemName: "plus")
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(SederTheme.brandGreen)
                            .clipShape(Circle())
                            .shadow(color: SederTheme.brandGreen.opacity(0.3), radius: 8, y: 4)
                    }
                    .environment(\.layoutDirection, .leftToRight)
                }
                .padding(.trailing, 16)
                .padding(.bottom, 16)
                .environment(\.layoutDirection, .leftToRight)
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

    private var monthName: String { currentMonthName }

    private var yearString: String {
        "\(Calendar.current.component(.year, from: viewModel.selectedMonth))"
    }
}

// MARK: - Green Nav Bar

struct GreenNavBar: View {
    var onSettingsTap: () -> Void
    var onCalendarTap: () -> Void

    var body: some View {
        HStack {
            // Left side (physical): calendar icon
            Button(action: onCalendarTap) {
                Image(systemName: "calendar.badge.clock")
                    .font(.title3)
                    .foregroundStyle(.white)
            }

            Spacer()

            // Right side (physical): dark mode + avatar
            HStack(spacing: 12) {
                Button {} label: {
                    Image(systemName: "moon.fill")
                        .font(.body)
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 32, height: 32)
                        .background(.white.opacity(0.1))
                        .clipShape(Circle())
                }

                Button(action: onSettingsTap) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.9))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0)
        .background(SederTheme.brandGreen.ignoresSafeArea(edges: .top))
        .environment(\.layoutDirection, .leftToRight)
    }
}

// MARK: - KPI Card

struct KPICard: View {
    let title: String
    let amount: Double
    var icon: String = "banknote"
    var isHighlighted: Bool = false
    var amountColor: Color? = nil
    var iconColor: Color? = nil

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            Text(title)
                .font(.caption)
                .foregroundStyle(SederTheme.textSecondary)
                .padding(.bottom, 6)

            CurrencyText(
                amount: amount,
                font: .system(size: 24, weight: .bold, design: .rounded),
                color: amountColor ?? SederTheme.textPrimary
            )

            Spacer()

            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(iconColor ?? SederTheme.textTertiary)
                Spacer()
            }
        }
        .padding(12)
        .frame(height: 100)
        .frame(maxWidth: .infinity, alignment: .trailing)
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
