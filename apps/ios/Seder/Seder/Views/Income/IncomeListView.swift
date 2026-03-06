import SwiftUI

struct IncomeListView: View {
    @StateObject private var viewModel = IncomeViewModel()
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddSheet = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Month picker
                MonthPicker(selectedDate: $viewModel.selectedMonth)
                    .padding()

                // Summary bar
                HStack {
                    VStack(alignment: .center) {
                        Text("סה״כ")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        CurrencyText(
                            amount: viewModel.entries.reduce(0) { $0 + $1.grossAmount },
                            font: .headline
                        )
                    }
                    Spacer()
                    Text("\(viewModel.entries.count) רשומות")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)
                .padding(.bottom, 8)

                Divider()

                // List
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if viewModel.entries.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("אין רשומות החודש")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(viewModel.entries) { entry in
                            IncomeEntryRow(
                                entry: entry,
                                onMarkSent: {
                                    Task { await viewModel.markSent(entry.id) }
                                },
                                onMarkPaid: {
                                    Task { await viewModel.markPaid(entry.id) }
                                }
                            )
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                let entry = viewModel.entries[index]
                                Task { await viewModel.deleteEntry(entry.id) }
                            }
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.loadEntries()
                    }
                }
            }
            .navigationTitle("הכנסות")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                IncomeFormSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environmentObject(auth)
            }
            .task { await viewModel.loadEntries() }
            .onChange(of: viewModel.selectedMonth) {
                Task { await viewModel.loadEntries() }
            }
        }
    }
}
