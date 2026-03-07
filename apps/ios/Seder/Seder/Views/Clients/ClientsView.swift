import SwiftUI

struct ClientsView: View {
    @StateObject private var viewModel = ClientsViewModel()
    @State private var showAddClient = false
    @State private var newClientName = ""

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Green navbar
                HStack {
                    Spacer()
                    Text("לקוחות")
                        .font(.headline)
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
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "person.2")
                                .font(.system(size: 40))
                                .foregroundStyle(SederTheme.textTertiary)
                            Text("אין לקוחות")
                                .font(.headline)
                                .foregroundStyle(SederTheme.textPrimary)
                            Button { showAddClient = true } label: {
                                Label("הוספת לקוח", systemImage: "plus")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(SederTheme.brandGreen)
                            }
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 4) {
                                ForEach(viewModel.clients) { client in
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
                                                    .font(.caption)
                                                    .foregroundStyle(SederTheme.textSecondary)
                                            }
                                        }

                                        Spacer()

                                        // Name + avatar (right in RTL)
                                        HStack(spacing: 10) {
                                            Text(client.name)
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(SederTheme.textPrimary)

                                            Text(String(client.name.prefix(1)))
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(SederTheme.brandGreen)
                                                .frame(width: 36, height: 36)
                                                .background(SederTheme.brandGreen.opacity(0.1))
                                                .clipShape(Circle())
                                        }
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(SederTheme.cardBg)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                                    )
                                    .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.top, 8)
                        }
                        .refreshable { await viewModel.loadClients() }
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
                    Button { showAddClient = true } label: {
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
        .alert("לקוח חדש", isPresented: $showAddClient) {
            TextField("שם הלקוח", text: $newClientName)
            Button("ביטול", role: .cancel) { newClientName = "" }
            Button("הוספה") {
                Task {
                    _ = await viewModel.createClient(CreateClientRequest(name: newClientName))
                    newClientName = ""
                }
            }
        }
        .task { await viewModel.loadClients() }
    }
}
