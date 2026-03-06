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
        viewModel.entries.reduce(0) { $0 + $1.paidAmount }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Month picker
                MonthPicker(selectedDate: $viewModel.selectedMonth)
                    .padding(.vertical, 12)

                // Summary cards
                HStack(spacing: 10) {
                    SummaryCard(
                        title: "ברוטו",
                        amount: totalGross,
                        color: SederTheme.kpiGross
                    )
                    SummaryCard(
                        title: "שולם",
                        amount: totalPaid,
                        color: SederTheme.kpiPaid
                    )
                    SummaryCard(
                        title: "רשומות",
                        count: viewModel.entries.count,
                        color: SederTheme.kpiJobs
                    )
                }
                .padding(.horizontal)
                .padding(.bottom, 12)

                // List
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                        .tint(SederTheme.brandGreen)
                    Spacer()
                } else if viewModel.entries.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "tray")
                            .font(.system(size: 48))
                            .foregroundStyle(.quaternary)
                        Text("אין רשומות החודש")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button {
                            showAddSheet = true
                        } label: {
                            Label("הוספת הכנסה", systemImage: "plus")
                                .font(.subheadline.weight(.medium))
                        }
                        .foregroundStyle(SederTheme.brandGreen)
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
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showAddSheet = true } label: {
                            Label("הכנסה חדשה", systemImage: "plus")
                        }
                        Button { showCalendarImport = true } label: {
                            Label("ייבוא מיומן", systemImage: "calendar")
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(SederTheme.brandGreen)
                    }
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
    }
}

struct SummaryCard: View {
    let title: String
    var amount: Double? = nil
    var count: Int? = nil
    let color: Color

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(color)
            if let amount {
                CurrencyText(amount: amount, font: .system(.callout, design: .rounded).bold())
            } else if let count {
                Text("\(count)")
                    .font(.system(.callout, design: .rounded).bold())
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
