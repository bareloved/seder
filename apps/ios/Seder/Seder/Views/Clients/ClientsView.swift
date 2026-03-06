import SwiftUI

struct ClientsView: View {
    @StateObject private var viewModel = ClientsViewModel()
    @State private var showAddClient = false
    @State private var newClientName = ""

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .tint(SederTheme.brandGreen)
                } else if viewModel.clients.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.2")
                            .font(.system(size: 48))
                            .foregroundStyle(.quaternary)
                        Text("אין לקוחות")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button {
                            showAddClient = true
                        } label: {
                            Label("הוספת לקוח", systemImage: "plus")
                                .font(.subheadline.weight(.medium))
                        }
                        .foregroundStyle(SederTheme.brandGreen)
                    }
                } else {
                    List(viewModel.clients) { client in
                        HStack(spacing: 12) {
                            // Avatar circle
                            Circle()
                                .fill(SederTheme.brandGreen.opacity(0.12))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text(String(client.name.prefix(1)))
                                        .font(.headline.weight(.semibold))
                                        .foregroundStyle(SederTheme.brandGreen)
                                )

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text(client.name)
                                    .font(.headline)
                                HStack(spacing: 12) {
                                    if let jobs = client.jobCount, jobs > 0 {
                                        HStack(spacing: 3) {
                                            Text("\(jobs)")
                                                .font(.caption.weight(.medium))
                                            Image(systemName: "briefcase")
                                                .font(.caption2)
                                        }
                                        .foregroundStyle(.secondary)
                                    }
                                    if let revenue = client.thisYearRevenue, revenue > 0 {
                                        CurrencyText(amount: revenue, font: .subheadline.weight(.medium), color: SederTheme.paidColor)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(.plain)
                    .refreshable { await viewModel.loadClients() }
                }
            }
            .navigationTitle("לקוחות")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddClient = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(SederTheme.brandGreen)
                    }
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
}
