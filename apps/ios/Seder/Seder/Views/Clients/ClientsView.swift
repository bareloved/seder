import SwiftUI

struct ClientsView: View {
    @ObservedObject var viewModel: ClientsViewModel
    @State private var showFormSheet = false
    @State private var editingClient: Client?
    @State private var selectedClient: Client?

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Green navbar
                HStack {
                    Spacer()
                    Text("לקוחות")
                        .font(SederTheme.ploni(18, weight: .semibold))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.vertical, 12)
                .padding(.top, UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .first?.windows.first?.safeAreaInsets.top ?? 0)
                .background(SederTheme.brandGreen.ignoresSafeArea(edges: .top))
                .environment(\.layoutDirection, .leftToRight)

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

            // FAB
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        editingClient = nil
                        showFormSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(SederTheme.brandGreen)
                            .clipShape(Circle())
                            .shadow(color: SederTheme.brandGreen.opacity(0.3), radius: 8, y: 4)
                    }
                }
                .padding(.trailing, 16)
                .padding(.bottom, 16)
                .environment(\.layoutDirection, .leftToRight)
            }
        }
        .sheet(isPresented: $showFormSheet) {
            ClientFormSheet(
                viewModel: viewModel,
                editingClient: editingClient
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $selectedClient) { client in
            ClientDetailSheet(client: client, viewModel: viewModel)
                .presentationDetents([.medium])
        }
        .refreshable { await viewModel.loadClients() }
    }

    // MARK: - Client List

    private var clientList: some View {
        ScrollView {
            LazyVStack(spacing: 6) {
                ForEach(viewModel.clients) { client in
                    clientRow(client)
                        .onTapGesture { selectedClient = client }
                        .contextMenu {
                            Button {
                                editingClient = client
                                showFormSheet = true
                            } label: {
                                Label("עריכה", systemImage: "pencil")
                            }
                            Button(role: .destructive) {
                                Task { _ = await viewModel.archiveClient(client.id) }
                            } label: {
                                Label("מחיקה", systemImage: "trash")
                            }
                        }
                }
            }
            .padding(.top, 8)
            .padding(.horizontal, 12)
        }
        .refreshable { await viewModel.loadClients() }
    }

    // MARK: - Client Row

    private func clientRow(_ client: Client) -> some View {
        HStack(spacing: 12) {
            // Revenue + jobs (left in RTL)
            VStack(alignment: .leading, spacing: 2) {
                if let revenue = client.thisYearRevenue, revenue > 0 {
                    CurrencyText(
                        amount: revenue,
                        size: 15,
                        weight: .medium,
                        color: SederTheme.paidColor
                    )
                }
                if let jobs = client.jobCount, jobs > 0 {
                    Text("\(jobs) עבודות")
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(SederTheme.textSecondary)
                }
                if let outstanding = client.outstandingAmount, outstanding > 0 {
                    CurrencyText(
                        amount: outstanding,
                        size: 13,
                        weight: .regular,
                        color: SederTheme.sentColor
                    )
                }
            }

            Spacer()

            // Name + contact info (right in RTL)
            VStack(alignment: .trailing, spacing: 2) {
                Text(client.name)
                    .font(SederTheme.ploni(17, weight: .semibold))
                    .foregroundStyle(SederTheme.textPrimary)
                if let email = client.email, !email.isEmpty {
                    Text(email)
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(SederTheme.textTertiary)
                }
            }

            // Avatar
            Text(String(client.name.prefix(1)))
                .font(SederTheme.ploni(16, weight: .semibold))
                .foregroundStyle(SederTheme.brandGreen)
                .frame(width: 38, height: 38)
                .background(SederTheme.brandGreen.opacity(0.1))
                .clipShape(Circle())
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "person.2")
                .font(.system(size: 40))
                .foregroundStyle(SederTheme.textTertiary)

            Text("אין לקוחות")
                .font(SederTheme.ploni(18, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            Text("הוסף לקוחות כדי לעקוב אחרי ההכנסות שלך")
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
    @ObservedObject var viewModel: ClientsViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(client.name)
                    .font(SederTheme.ploni(22, weight: .semibold))
                    .foregroundStyle(SederTheme.textPrimary)
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(SederTheme.subtleBg)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 14)

            Divider()

            ScrollView {
                VStack(spacing: 16) {
                    // Analytics
                    if client.jobCount ?? 0 > 0 {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            analyticsCard(label: "סה״כ הכנסות", value: formatCurrency(client.totalEarned ?? 0))
                            analyticsCard(label: "השנה", value: formatCurrency(client.thisYearRevenue ?? 0))
                            analyticsCard(label: "עבודות", value: "\(client.jobCount ?? 0)")
                            analyticsCard(label: "ממוצע לעבודה", value: formatCurrency(client.averagePerJob ?? 0))
                            if let outstanding = client.outstandingAmount, outstanding > 0 {
                                analyticsCard(label: "ממתין לתשלום", value: formatCurrency(outstanding), color: SederTheme.sentColor)
                            }
                        }
                    }

                    // Contact info
                    if client.email != nil || client.phone != nil {
                        VStack(spacing: 8) {
                            if let email = client.email, !email.isEmpty {
                                contactRow(icon: "envelope", value: email)
                            }
                            if let phone = client.phone, !phone.isEmpty {
                                contactRow(icon: "phone", value: phone)
                            }
                        }
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

    private func contactRow(icon: String, value: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(SederTheme.textTertiary)
                .frame(width: 28)
            Text(value)
                .font(SederTheme.ploni(16))
                .foregroundStyle(SederTheme.textPrimary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(SederTheme.subtleBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? "0"
        return "₪\(formatted)"
    }
}
