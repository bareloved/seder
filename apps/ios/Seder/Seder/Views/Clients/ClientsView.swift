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
                } else if viewModel.clients.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.2")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("אין לקוחות")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    List(viewModel.clients) { client in
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(client.name)
                                .font(.headline)
                            if let revenue = client.thisYearRevenue, revenue > 0 {
                                HStack {
                                    CurrencyText(amount: revenue, font: .subheadline, color: .secondary)
                                    Text("השנה:")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let jobs = client.jobCount, jobs > 0 {
                                Text("\(jobs) עבודות")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
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
                        Image(systemName: "plus")
                    }
                }
            }
            .alert("לקוח חדש", isPresented: $showAddClient) {
                TextField("שם הלקוח", text: $newClientName)
                Button("ביטול", role: .cancel) { newClientName = "" }
                Button("הוספה") {
                    Task {
                        await viewModel.createClient(CreateClientRequest(name: newClientName))
                        newClientName = ""
                    }
                }
            }
            .task { await viewModel.loadClients() }
        }
    }
}
