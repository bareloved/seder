import SwiftUI

struct ClientsView: View {
    @Bindable var viewModel: ClientsViewModel
    @EnvironmentObject var auth: AuthViewModel
    @State private var showFormSheet = false
    @State private var showSettings = false
    @State private var editingClient: Client?
    @State private var selectedClient: Client?

    var body: some View {
        VStack(spacing: 0) {
            GreenNavBar(
                title: "לקוחות",
                onSettingsTap: { showSettings = true },
                avatarURL: auth.user?.image
            ) {
                Button {
                    editingClient = nil
                    showFormSheet = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .semibold))
                        Text("לקוח חדש")
                            .font(SederTheme.ploni(14, weight: .medium))
                    }
                    .foregroundStyle(.white)
                }
            }

            Group {
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                        .tint(SederTheme.brandGreen)
                    Spacer()
                } else if viewModel.clients.isEmpty {
                    emptyState
                } else {
                    clientList
                }
            }
            .background(SederTheme.pageBg)
        }
        .ignoresSafeArea(edges: .top)
        .environment(\.layoutDirection, .rightToLeft)
        .sheet(isPresented: $showFormSheet) {
            ClientFormSheet(
                viewModel: viewModel,
                editingClient: editingClient
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $selectedClient) { client in
            ClientDetailSheet(client: client, viewModel: viewModel)
                .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .refreshable { await viewModel.loadClients() }
    }

    // MARK: - Client List

    private var clientList: some View {
        VStack(spacing: 0) {
            // Search + Sort bar
            HStack(spacing: 8) {
                // Search field (first = right in RTL)
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14))
                        .foregroundStyle(SederTheme.textTertiary)
                    TextField("חיפוש לקוח...", text: $viewModel.searchQuery)
                        .font(SederTheme.ploni(16))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(SederTheme.subtleBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                // Sort button
                Menu {
                    ForEach(ClientSortOption.allCases, id: \.self) { option in
                        Button {
                            viewModel.sortOption = option
                        } label: {
                            if option == viewModel.sortOption {
                                Label(option.label, systemImage: "checkmark")
                            } else {
                                Text(option.label)
                            }
                        }
                    }
                    Divider()
                    Button {
                        viewModel.sortAscending.toggle()
                    } label: {
                        Label(
                            viewModel.sortAscending ? "סדר יורד" : "סדר עולה",
                            systemImage: viewModel.sortAscending ? "arrow.down" : "arrow.up"
                        )
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: viewModel.sortAscending ? "arrow.up" : "arrow.down")
                            .font(.system(size: 10, weight: .bold))
                        Text(viewModel.sortOption.label)
                            .font(SederTheme.ploni(14, weight: .medium))
                    }
                    .foregroundStyle(SederTheme.brandGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(SederTheme.brandGreen.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            .padding(.bottom, 4)

            ScrollView {
                LazyVStack(spacing: 6) {
                    ForEach(viewModel.filteredClients, id: \.id) { client in
                        clientRow(client)
                            .onTapGesture { selectedClient = client }
                    }
                }
                .padding(.top, 8)
                .padding(.horizontal, 12)
            }
            .refreshable { await viewModel.loadClients() }
        }
    }

    // MARK: - Health Color Helper

    private func healthColor(_ health: String) -> Color {
        switch health {
        case "bad": return .red
        case "warning": return .orange
        default: return .green
        }
    }

    // MARK: - Client Row

    private func clientRow(_ client: Client) -> some View {
        HStack(spacing: 12) {
            // Avatar (first = right in RTL)
            Text(String(client.name.prefix(1)))
                .font(SederTheme.ploni(16, weight: .semibold))
                .foregroundStyle(SederTheme.brandGreen)
                .frame(width: 40, height: 40)
                .background(SederTheme.brandGreen.opacity(0.1))
                .clipShape(Circle())

            // Name + email
            VStack(alignment: .leading, spacing: 2) {
                Text(client.name)
                    .font(SederTheme.ploni(18, weight: .semibold))
                    .foregroundStyle(SederTheme.textPrimary)
                if let email = client.email, !email.isEmpty {
                    Text(email)
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textTertiary)
                        .lineLimit(1)
                }
                if let phone = client.phone, !phone.isEmpty {
                    Text(phone)
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textTertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Revenue + stats (last = left in RTL)
            VStack(alignment: .trailing, spacing: 2) {
                if let revenue = client.thisYearRevenue, revenue > 0 {
                    CurrencyText(
                        amount: revenue,
                        size: 15,
                        weight: .medium,
                        color: SederTheme.paidColor
                    )
                }
                if let jobs = client.thisYearJobCount, jobs > 0 {
                    Text("\(jobs) עבודות")
                        .font(SederTheme.ploni(12))
                        .foregroundStyle(SederTheme.textSecondary)
                }
                if let outstanding = client.outstandingAmount, outstanding > 0 {
                    HStack(spacing: 2) {
                        Text("חוב")
                            .font(SederTheme.ploni(11))
                        CurrencyText(
                            amount: outstanding,
                            size: 12,
                            weight: .regular,
                            color: SederTheme.sentColor
                        )
                    }
                    .foregroundStyle(SederTheme.sentColor)
                }
            }

            // Chevron (far left in RTL)
            Image(systemName: "chevron.left")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(SederTheme.textTertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "person.crop.rectangle.stack")
                .font(.system(size: 44))
                .foregroundStyle(SederTheme.textTertiary)

            Text("אין לקוחות עדיין")
                .font(SederTheme.ploni(18, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            Text("הוסף לקוח ראשון כדי להתחיל לעקוב")
                .font(SederTheme.ploni(15))
                .foregroundStyle(SederTheme.textTertiary)
                .multilineTextAlignment(.center)

            Button {
                editingClient = nil
                showFormSheet = true
            } label: {
                Text("הוסף לקוח")
                    .font(SederTheme.ploni(16, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(SederTheme.brandGreen)
                    .clipShape(Capsule())
            }
            .padding(.top, 8)

            Spacer()
        }
    }
}

// MARK: - Client Detail Sheet

struct ClientDetailSheet: View {
    let client: Client
    @Bindable var viewModel: ClientsViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedEntry: IncomeEntry?
    @State private var showEditSheet = false
    @State private var showAllTimeRevenue = false
    @State private var showMonthlyPercentage = false
    @State private var showAllTimeJobs = false

    var body: some View {
        VStack(spacing: 0) {
            // Header with avatar + name + contact actions
            VStack(spacing: 12) {
                HStack {
                    // Name + avatar (right in RTL)
                    HStack(spacing: 12) {
                        Text(String(client.name.prefix(1)))
                            .font(SederTheme.ploni(20, weight: .semibold))
                            .foregroundStyle(SederTheme.brandGreen)
                            .frame(width: 48, height: 48)
                            .background(SederTheme.brandGreen.opacity(0.1))
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 4) {
                            Text(client.name)
                                .font(SederTheme.ploni(22, weight: .semibold))
                                .foregroundStyle(SederTheme.textPrimary)
                            if let health = client.paymentHealth {
                                Text(health == "good" ? "תקין" : health == "warning" ? "לתשומת לב" : "בעייתי")
                                    .font(.system(size: 11, weight: .medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(healthColor(health).opacity(0.15))
                                    .foregroundColor(healthColor(health))
                                    .clipShape(Capsule())
                            }
                        }
                    }

                    Spacer()

                    // Edit + Dismiss (left in RTL)
                    HStack(spacing: 8) {
                        Button { showEditSheet = true } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(SederTheme.textSecondary)
                                .frame(width: 28, height: 28)
                                .background(SederTheme.subtleBg)
                                .clipShape(Circle())
                        }
                        Button { dismiss() } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(SederTheme.textSecondary)
                                .frame(width: 28, height: 28)
                                .background(SederTheme.subtleBg)
                                .clipShape(Circle())
                        }
                    }
                }

                // Contact action buttons
                if client.phone != nil || client.email != nil {
                    HStack(spacing: 12) {
                        if let phone = client.phone, !phone.isEmpty {
                            contactActionButton(
                                icon: "phone.fill",
                                label: "חייג",
                                color: SederTheme.brandGreen
                            ) {
                                if let url = URL(string: "tel:\(phone)") {
                                    UIApplication.shared.open(url)
                                }
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            contactActionButton(
                                icon: "envelope.fill",
                                label: "אימייל",
                                color: SederTheme.draftColor
                            ) {
                                if let url = URL(string: "mailto:\(email)") {
                                    UIApplication.shared.open(url)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 14)

            Divider()

            ScrollView {
                VStack(spacing: 20) {
                    // Analytics grid
                    if client.jobCount ?? 0 > 0 {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            analyticsCard(label: "החודש", value: formatCurrency(client.thisMonthRevenue ?? 0))

                            // Year card — tap to toggle all-time
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    showAllTimeRevenue.toggle()
                                }
                            } label: {
                                analyticsCard(
                                    label: showAllTimeRevenue ? "סה״כ" : "השנה",
                                    value: formatCurrency(showAllTimeRevenue ? (client.totalEarned ?? 0) : (client.thisYearRevenue ?? 0))
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    showAllTimeJobs.toggle()
                                }
                            } label: {
                                analyticsCard(
                                    label: showAllTimeJobs ? "סה״כ עבודות" : "עבודות השנה",
                                    value: "\(showAllTimeJobs ? (client.jobCount ?? 0) : (client.thisYearJobCount ?? 0))"
                                )
                            }
                            .buttonStyle(.plain)
                            analyticsCard(label: "ממוצע לעבודה", value: formatCurrency(client.averagePerJob ?? 0))
                            if let outstanding = client.outstandingAmount, outstanding > 0 {
                                analyticsCard(label: "ממתין לתשלום", value: formatCurrency(outstanding), color: SederTheme.sentColor)
                            }
                            if let percentage = client.incomePercentage, percentage > 0 {
                                Button {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        showMonthlyPercentage.toggle()
                                    }
                                } label: {
                                    if showMonthlyPercentage {
                                        let monthPct: Int = {
                                            let total = (client.thisMonthRevenue ?? 0)
                                            guard total > 0, let yearRev = client.thisYearRevenue, yearRev > 0 else { return 0 }
                                            // Approximate: use year percentage scaled by month/year ratio
                                            // Not exact, but gives a sense
                                            return Int(total / yearRev * Double(percentage))
                                        }()
                                        analyticsCard(label: "מההכנסות החודש", value: "\(monthPct)%")
                                    } else {
                                        analyticsCard(label: "מההכנסות השנה", value: "\(Int(percentage))%")
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            if let lateRate = client.latePaymentRate, lateRate > 0 {
                                analyticsCard(label: "תשלום מאוחר", value: "\(Int(lateRate))%")
                            }
                            if let months = client.lastActiveMonths {
                                let text = months == 0 ? "החודש" : months == 1 ? "לפני חודש" : months == 2 ? "לפני חודשיים" : "לפני \(months) חודשים"
                                analyticsCard(label: "עבודה אחרונה", value: text)
                            }
                        }

                    }

                    // Recent jobs
                    if !viewModel.clientEntries.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("עבודות אחרונות")
                                    .font(SederTheme.ploni(15, weight: .medium))
                                    .foregroundStyle(SederTheme.textSecondary)
                                Spacer()
                                if let trend = client.activityTrend {
                                    HStack(spacing: 4) {
                                        Text(trend == "up" ? "יותר עבודות לאחרונה" : trend == "down" ? "פחות עבודות לאחרונה" : "פעילות יציבה")
                                            .foregroundStyle(.secondary)
                                        Text(trend == "up" ? "↑" : trend == "down" ? "↓" : "→")
                                            .foregroundStyle(trend == "up" ? .green : trend == "down" ? .red : .secondary)
                                    }
                                    .font(.system(size: 12))
                                }
                            }

                            ForEach(viewModel.clientEntries.prefix(5)) { entry in
                                Button {
                                    selectedEntry = entry
                                } label: {
                                    recentJobRow(entry)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    } else if viewModel.isLoadingEntries {
                        ProgressView()
                            .tint(SederTheme.brandGreen)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }

                    // Notes
                    if let notes = client.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 4) {
                                Image(systemName: "text.quote")
                                    .font(.system(size: 12))
                                    .foregroundStyle(SederTheme.textTertiary)
                                Text("הערות")
                                    .font(SederTheme.ploni(14, weight: .medium))
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                            Text(notes)
                                .font(SederTheme.ploni(16))
                                .foregroundStyle(SederTheme.textPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(SederTheme.subtleBg)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
        }
        .background(SederTheme.pageBg)
        .environment(\.layoutDirection, .rightToLeft)
        .task { await viewModel.loadClientEntries(clientId: client.id) }
        .sheet(item: $selectedEntry) { entry in
            IncomeDetailSheet(
                viewModel: IncomeViewModel(),
                entry: entry,
                categories: [],
                clientNames: []
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showEditSheet) {
            ClientFormSheet(
                viewModel: viewModel,
                editingClient: client
            )
            .presentationDetents([.large])
        }
    } // end body

    // MARK: - Helper Views

    private func healthColor(_ health: String) -> Color {
        switch health {
        case "bad": return .red
        case "warning": return .orange
        default: return .green
        }
    }

    private func contactActionButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                Text(label)
                    .font(SederTheme.ploni(14, weight: .medium))
            }
            .foregroundStyle(color)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(color.opacity(0.1))
            .clipShape(Capsule())
        }
    }

    private func recentJobRow(_ entry: IncomeEntry) -> some View {
        HStack(spacing: 10) {
            // Date
            Text(shortDate(entry.date))
                .font(.system(size: 13, weight: .medium, design: .rounded).monospacedDigit())
                .foregroundStyle(SederTheme.textSecondary)
                .frame(width: 42)

            // Description
            Text(entry.description)
                .font(SederTheme.ploni(15))
                .foregroundStyle(SederTheme.textPrimary)
                .lineLimit(1)

            Spacer()

            // Amount
            CurrencyText(
                amount: entry.grossAmount,
                size: 14,
                weight: .medium,
                color: entry.paymentStatus == .paid ? SederTheme.paidColor : SederTheme.textPrimary
            )

            // Status badge
            StatusBadge(
                text: entry.invoiceStatus.label,
                color: jobStatusColor(entry)
            )
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(SederTheme.subtleBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func analyticsCard(label: String, value: String, color: Color = SederTheme.textPrimary) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(color)
            Text(label)
                .font(SederTheme.ploni(13))
                .foregroundStyle(SederTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(SederTheme.subtleBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func shortDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count >= 3 else { return dateStr }
        return "\(parts[2])/\(parts[1])"
    }

    private func jobStatusColor(_ entry: IncomeEntry) -> Color {
        if entry.paymentStatus == .paid { return SederTheme.paidColor }
        if entry.invoiceStatus == .sent { return SederTheme.sentColor }
        return SederTheme.draftColor
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? "0"
        return "₪\(formatted)"
    }
}
