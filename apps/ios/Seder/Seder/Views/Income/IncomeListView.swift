import SwiftUI

enum KPIFilter: String, CaseIterable {
    case all
    case readyToInvoice
    case invoiced
    case paid
}

struct IncomeListView: View {
    @StateObject private var viewModel = IncomeViewModel()
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddSheet = false
    @State private var showSettings = false
    @State private var showCalendarImport = false
    @State private var showFilterSheet = false
    @State private var editingEntry: IncomeEntry?
    @State private var activeFilter: KPIFilter = .all
    @State private var searchQuery = ""
    @State private var selectedCategoryId: String?
    @State private var selectedClientName: String?
    @State private var sortColumn: SortColumn = .date
    @State private var sortDirection: SortDirection = .asc
    @StateObject private var categoriesVM = CategoriesViewModel()
    @State private var clientsVM = ClientsViewModel()

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

    private var filteredEntries: [IncomeEntry] {
        var result = viewModel.entries

        // KPI filter
        switch activeFilter {
        case .all: break
        case .readyToInvoice:
            result = result.filter { $0.invoiceStatus == .draft }
        case .invoiced:
            result = result.filter { $0.invoiceStatus == .sent && $0.paymentStatus != .paid }
        case .paid:
            result = result.filter { $0.paymentStatus == .paid }
        }

        // Category filter
        if let catId = selectedCategoryId {
            result = result.filter { $0.categoryId == catId }
        }

        // Client filter
        if let client = selectedClientName {
            result = result.filter { $0.clientName == client }
        }

        // Search
        if !searchQuery.isEmpty {
            let q = searchQuery.lowercased()
            result = result.filter {
                $0.description.lowercased().contains(q) ||
                $0.clientName.lowercased().contains(q) ||
                ($0.categoryData?.name.lowercased().contains(q) ?? false)
            }
        }

        // Sort
        result.sort { a, b in
            let cmp: Bool
            switch sortColumn {
            case .date:
                cmp = a.date < b.date
            case .description:
                cmp = a.description.localizedCompare(b.description) == .orderedAscending
            case .amount:
                cmp = a.grossAmount < b.grossAmount
            case .client:
                cmp = a.clientName.localizedCompare(b.clientName) == .orderedAscending
            case .category:
                cmp = (a.categoryData?.name ?? "").localizedCompare(b.categoryData?.name ?? "") == .orderedAscending
            case .status:
                cmp = a.invoiceStatus.rawValue < b.invoiceStatus.rawValue
            }
            return sortDirection == .asc ? cmp : !cmp
        }

        return result
    }

    private var uniqueClientNames: [String] {
        let apiNames = clientsVM.clients.map(\.name)
        let entryNames = viewModel.entries.map(\.clientName)
        return Array(Set(apiNames + entryNames)).filter { !$0.isEmpty }.sorted()
    }

    private var hasActiveFilter: Bool {
        !searchQuery.isEmpty || selectedCategoryId != nil || selectedClientName != nil || sortColumn != .date || sortDirection != .asc
    }

    var body: some View {
        VStack(spacing: 0) {
            // Green navbar
            GreenNavBar(
                onSettingsTap: { showSettings = true },
                onAddTap: { showAddSheet = true },
                avatarURL: auth.user?.image
            )

            // Filter bar (pinned below navbar)
            FilterBar(
                selectedMonth: $viewModel.selectedMonth,
                hasUnpaid: totalUnpaid > 0,
                onCalendarTap: { showCalendarImport = true },
                onFilterTap: { showFilterSheet = true },
                hasActiveFilter: hasActiveFilter,
                monthStatuses: viewModel.monthStatuses
            )
            .padding(.horizontal, 16)

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
                            filter: .all,
                            activeFilter: $activeFilter,
                            activeRingColor: SederTheme.textPrimary
                        )
                        KPICard(
                            title: "לפני חיוב",
                            amount: readyToInvoice,
                            icon: "doc.text",
                            iconColor: Color(red: 0.02, green: 0.71, blue: 0.83),
                            filter: .readyToInvoice,
                            activeFilter: $activeFilter,
                            activeRingColor: Color(red: 0.02, green: 0.71, blue: 0.83)
                        )
                        KPICard(
                            title: "מחכה לתשלום",
                            amount: totalUnpaid,
                            icon: "doc.plaintext",
                            iconColor: SederTheme.sentColor,
                            filter: .invoiced,
                            activeFilter: $activeFilter,
                            activeRingColor: SederTheme.sentColor
                        )
                        KPICard(
                            title: "התקבל החודש",
                            amount: totalPaid,
                            icon: "arrow.up.right",
                            amountColor: SederTheme.paidColor,
                            iconColor: SederTheme.paidColor,
                            filter: .paid,
                            activeFilter: $activeFilter,
                            activeRingColor: SederTheme.paidColor
                        )
                    }
                    .padding(.top, 8)

                    // Active filters bar
                    if hasActiveFilter {
                        ActiveFiltersBar(
                            searchQuery: $searchQuery,
                            selectedCategoryId: $selectedCategoryId,
                            selectedClientName: $selectedClientName,
                            sortColumn: $sortColumn,
                            sortDirection: $sortDirection,
                            categories: categoriesVM.categories
                        )
                    }

                    // Entries
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(SederTheme.brandGreen)
                            .padding(.top, 40)
                    } else if filteredEntries.isEmpty {
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
                            ForEach(filteredEntries) { entry in
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
                                .onTapGesture { editingEntry = entry }
                            }
                        }
                    }

                    Spacer().frame(height: 80)
                }
                .frame(width: UIScreen.main.bounds.width - 24)
                .frame(maxWidth: .infinity)
            }
            .refreshable { await viewModel.loadEntries() }
            .background(SederTheme.pageBg)
        }
        .ignoresSafeArea(edges: .top)
        .sheet(isPresented: $showAddSheet) {
            IncomeDetailSheet(
                viewModel: viewModel,
                categories: categoriesVM.categories,
                clientNames: uniqueClientNames,
                clientsVM: clientsVM
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $editingEntry) { entry in
            IncomeDetailSheet(
                viewModel: viewModel,
                entry: entry,
                categories: categoriesVM.categories,
                clientNames: uniqueClientNames,
                clientsVM: clientsVM
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showFilterSheet) {
            FilterSheet(
                searchQuery: $searchQuery,
                selectedCategoryId: $selectedCategoryId,
                selectedClientName: $selectedClientName,
                sortColumn: $sortColumn,
                sortDirection: $sortDirection,
                categories: categoriesVM.categories,
                clientNames: uniqueClientNames
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showCalendarImport) {
            CalendarImportView(onImportComplete: {
                Task { await viewModel.loadEntries() }
            })
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(auth)
        }
        .task {
            await viewModel.loadEntries()
            await viewModel.loadAllMonthStatuses()
            await categoriesVM.loadCategories()
            await clientsVM.loadClients()
        }
        .onChange(of: viewModel.selectedMonth) { _ in
            Task {
                await viewModel.loadEntries()
                await viewModel.loadAllMonthStatuses()
            }
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
    var onAddTap: (() -> Void)?
    var avatarURL: String?

    var body: some View {
        ZStack {
            // Center: title
            Text("הכנסות")
                .font(SederTheme.ploni(18, weight: .semibold))
                .foregroundStyle(.white)

            HStack {
                // Physical right: add button
                if let onAddTap {
                    Button(action: onAddTap) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 13, weight: .semibold))
                            Text("עבודה חדשה")
                                .font(SederTheme.ploni(14, weight: .medium))
                        }
                        .foregroundStyle(.white)
                    }
                }

                Spacer()

                // Physical left: avatar
                Button(action: onSettingsTap) {
                    if let urlString = avatarURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(.white.opacity(0.9))
                        }
                        .frame(width: 34, height: 34)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0)
        .background(SederTheme.headerBg.ignoresSafeArea(edges: .top))
    }
}

// MARK: - Filter Bar

struct FilterBar: View {
    @Binding var selectedMonth: Date
    var hasUnpaid: Bool
    var onCalendarTap: () -> Void
    var onFilterTap: () -> Void
    var hasActiveFilter: Bool
    var monthStatuses: [Int: IncomeViewModel.MonthStatus]

    @State private var showMonthPicker = false
    @State private var showYearPicker = false

    private let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                          "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

    private var borderColor: Color { Color(.separator).opacity(0.3) }

    var body: some View {
        HStack(spacing: 8) {
            // Physical left: Filter + Calendar buttons
            outlinedButton(icon: "line.3.horizontal.decrease", color: hasActiveFilter ? SederTheme.brandGreen : SederTheme.textPrimary, action: onFilterTap)
            outlinedButton(icon: "calendar.badge.plus", color: .blue, action: onCalendarTap)

            Spacer()

            // Center: Month picker
            HStack(spacing: 0) {
                Button {
                    selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: selectedMonth)!
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 30, height: 36)
                        .environment(\.layoutDirection, .leftToRight)
                }

                Button { showMonthPicker.toggle() } label: {
                    HStack(spacing: 5) {
                        Text(months[Calendar.current.component(.month, from: selectedMonth) - 1])
                            .font(SederTheme.ploni(15, weight: .regular))
                            .foregroundStyle(SederTheme.textPrimary)
                            .lineLimit(1)
                            .fixedSize()
                        Circle()
                            .fill(hasUnpaid ? Color.red.opacity(0.8) : SederTheme.paidColor.opacity(0.8))
                            .frame(width: 6, height: 6)
                    }
                    .frame(minWidth: 120)
                }
                .popover(isPresented: $showMonthPicker, arrowEdge: .top) {
                    monthPickerList
                        .presentationCompactAdaptation(.popover)
                }

                Button {
                    selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)!
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
                Text(String(Calendar.current.component(.year, from: selectedMonth)))
                    .font(SederTheme.ploni(15, weight: .regular))
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

    private var currentMonthIndex: Int {
        Calendar.current.component(.month, from: selectedMonth)
    }

    private var monthPickerList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(0..<12, id: \.self) { i in
                    let monthNum = i + 1
                    let isCurrent = currentMonthIndex == monthNum
                    let monthHasUnpaid = monthStatuses[monthNum]

                    Button {
                        var components = Calendar.current.dateComponents([.year, .month, .day], from: selectedMonth)
                        components.month = monthNum
                        if let newDate = Calendar.current.date(from: components) {
                            selectedMonth = newDate
                        }
                        showMonthPicker = false
                    } label: {
                        HStack(spacing: 10) {
                            Text(months[i])
                                .font(SederTheme.ploni(16, weight: isCurrent ? .semibold : .regular))
                                .foregroundStyle(SederTheme.textPrimary)
                            Spacer()
                            Circle()
                                .fill(dotColor(for: monthHasUnpaid))
                                .frame(width: 8, height: 8)
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

    private var currentYear: Int {
        Calendar.current.component(.year, from: selectedMonth)
    }

    private var yearPickerList: some View {
        let thisYear = Calendar.current.component(.year, from: Date())
        let years = Array((thisYear - 3)...(thisYear + 1))

        return VStack(spacing: 0) {
            ForEach(years, id: \.self) { year in
                Button {
                    var components = Calendar.current.dateComponents([.year, .month, .day], from: selectedMonth)
                    components.year = year
                    if let newDate = Calendar.current.date(from: components) {
                        selectedMonth = newDate
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

    private func dotColor(for status: IncomeViewModel.MonthStatus?) -> Color {
        switch status {
        case .hasUnpaid: return Color.red.opacity(0.7)
        case .allPaid: return SederTheme.paidColor.opacity(0.8)
        case .empty, .none: return .clear
        }
    }

    private func outlinedButton(icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(color)
                .frame(width: 40, height: 36)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(borderColor, lineWidth: 1)
                )
        }
    }
}

// MARK: - KPI Card
// In RTL: .leading = physical RIGHT, first HStack item = physical RIGHT

struct KPICard: View {
    let title: String
    let amount: Double
    var icon: String = "banknote"
    var amountColor: Color? = nil
    var iconColor: Color? = nil
    var filter: KPIFilter = .all
    @Binding var activeFilter: KPIFilter
    var activeRingColor: Color = .gray

    private var isActive: Bool { activeFilter == filter }

    var body: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                activeFilter = (activeFilter == filter) ? .all : filter
            }
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(SederTheme.ploni(15))
                    .foregroundStyle(SederTheme.textSecondary)

                Spacer()

                CurrencyText(
                    amount: amount,
                    size: 26,
                    weight: .regular,
                    color: amountColor ?? SederTheme.textPrimary
                )

                HStack {
                    Spacer()
                    Image(systemName: icon)
                        .font(.system(size: 12))
                        .foregroundStyle(iconColor ?? SederTheme.textTertiary)
                }
            }
            .padding(12)
            .frame(height: 92)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SederTheme.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        isActive ? activeRingColor : SederTheme.cardBorder,
                        lineWidth: isActive ? 1.5 : 1
                    )
            )
            .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Active Filters Bar

struct ActiveFiltersBar: View {
    @Binding var searchQuery: String
    @Binding var selectedCategoryId: String?
    @Binding var selectedClientName: String?
    @Binding var sortColumn: SortColumn
    @Binding var sortDirection: SortDirection
    var categories: [Category]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                if !searchQuery.isEmpty {
                    filterChip(label: "\"\(searchQuery)\"", icon: "magnifyingglass") {
                        searchQuery = ""
                    }
                }

                if let catId = selectedCategoryId,
                   let cat = categories.first(where: { $0.id == catId }) {
                    filterChip(label: cat.name, icon: "tag") {
                        selectedCategoryId = nil
                    }
                }

                if let client = selectedClientName {
                    filterChip(label: client, icon: "person") {
                        selectedClientName = nil
                    }
                }

                if sortColumn != .date || sortDirection != .asc {
                    filterChip(label: "\(sortColumn.label) \(sortDirection == .asc ? "↑" : "↓")", icon: "arrow.up.arrow.down") {
                        sortColumn = .date
                        sortDirection = .asc
                    }
                }

                // Clear all
                Button {
                    withAnimation {
                        searchQuery = ""
                        selectedCategoryId = nil
                        selectedClientName = nil
                        sortColumn = .date
                        sortDirection = .asc
                    }
                } label: {
                    Text("נקה הכל")
                        .font(SederTheme.ploni(12, weight: .medium))
                        .foregroundStyle(SederTheme.brandGreen)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func filterChip(label: String, icon: String, onRemove: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            Button {
                withAnimation { onRemove() }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(SederTheme.textTertiary)
            }

            Text(label)
                .font(SederTheme.ploni(12))
                .foregroundStyle(SederTheme.textPrimary)
                .lineLimit(1)

            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(SederTheme.textSecondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(SederTheme.cardBg)
        .clipShape(Capsule())
        .overlay(
            Capsule().stroke(SederTheme.cardBorder, lineWidth: 1)
        )
    }
}
