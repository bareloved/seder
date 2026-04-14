import SwiftUI

struct IdString: Identifiable, Hashable {
    let id: String
}

/// Wrapper that fetches a single rolling job by ID and presents RollingJobFormSheet in edit mode.
struct EditRollingJobSheet: View {
    let jobId: String
    let clients: [Client]
    let categories: [Category]

    @StateObject private var viewModel = RollingJobsViewModel()
    @State private var loadedJob: RollingJob?
    @State private var didLoad = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if let job = loadedJob {
                RollingJobFormSheet(
                    mode: .edit(job),
                    viewModel: viewModel,
                    clients: clients,
                    categories: categories
                )
            } else {
                VStack {
                    ProgressView()
                        .tint(SederTheme.brandGreen)
                        .scaleEffect(1.2)
                    Text("טוען...")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.top, 12)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(SederTheme.pageBg)
            }
        }
        .task {
            guard !didLoad else { return }
            didLoad = true
            await viewModel.load()
            loadedJob = viewModel.jobs.first(where: { $0.id == jobId })
            if loadedJob == nil {
                dismiss()
            }
        }
    }
}
