import SwiftUI

struct RollingJobsView: View {
    @StateObject private var viewModel = RollingJobsViewModel()
    let clients: [Client]
    let categories: [Category]
    @Environment(\.dismiss) private var dismiss

    @State private var formMode: RollingJobFormSheet.Mode?
    @State private var deletingJob: RollingJob?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.jobs.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.jobs.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 48))
                            .foregroundColor(SederTheme.textSecondary)
                        Text("אין סדרות")
                            .font(.headline)
                        Text("צור סדרה ראשונה כדי לעקוב אחר הכנסות חוזרות")
                            .font(.subheadline)
                            .foregroundColor(SederTheme.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(viewModel.jobs) { job in
                            RollingJobRow(
                                job: job,
                                onTogglePause: { Task { await viewModel.togglePause(job) } },
                                onEdit: { formMode = .edit(job) },
                                onDelete: { deletingJob = job }
                            )
                        }
                    }
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle("סדרות הכנסה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגור") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        formMode = .create
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task { await viewModel.load() }
            .sheet(item: Binding(
                get: { formMode.map { IdentifiedMode(mode: $0) } },
                set: { formMode = $0?.mode }
            )) { wrapper in
                RollingJobFormSheet(
                    mode: wrapper.mode,
                    viewModel: viewModel,
                    clients: clients,
                    categories: categories
                )
            }
            .sheet(item: $deletingJob) { job in
                DeleteRollingJobSheet(job: job, viewModel: viewModel)
            }
        }
    }

    private struct IdentifiedMode: Identifiable {
        let mode: RollingJobFormSheet.Mode
        var id: String {
            switch mode {
            case .create: return "create"
            case .edit(let j): return "edit-\(j.id)"
            }
        }
    }
}

struct RollingJobRow: View {
    let job: RollingJob
    let onTogglePause: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    private func cadenceLabel() -> String {
        switch job.cadence {
        case .daily(let n):
            return n == 1 ? "כל יום" : "כל \(n) ימים"
        case .weekly(let n, let weekdays):
            let names = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
            let days = weekdays.map { names[$0] }.joined(separator: ", ")
            return n == 1 ? "שבועי: \(days)" : "כל \(n) שבועות: \(days)"
        case .monthly(let n, let day):
            return n == 1 ? "חודשי ביום \(day)" : "כל \(n) חודשים ביום \(day)"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .foregroundColor(SederTheme.textSecondary)
            VStack(alignment: .trailing) {
                HStack {
                    Text(job.title).font(.headline)
                    if !job.isActive {
                        Text("מושהה")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SederTheme.subtleBg)
                            .cornerRadius(4)
                    }
                    if job.sourceCalendarRecurringEventId != nil {
                        Text("יומן")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SederTheme.subtleBg)
                            .cornerRadius(4)
                    }
                }
                Text("\(cadenceLabel()) · ₪\(job.amountGross) · \(job.clientName)")
                    .font(.subheadline)
                    .foregroundColor(SederTheme.textSecondary)
            }
            Spacer()
            Menu {
                Button(job.isActive ? "השהה" : "חדש", action: onTogglePause)
                Button("ערוך", action: onEdit)
                Button("מחק", role: .destructive, action: onDelete)
            } label: {
                Image(systemName: "ellipsis")
                    .padding(8)
            }
        }
        .opacity(job.isActive ? 1.0 : 0.6)
        .environment(\.layoutDirection, .rightToLeft)
    }
}
