import SwiftUI

struct DeleteRollingJobSheet: View {
    let job: RollingJob
    @ObservedObject var viewModel: RollingJobsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var deleteFutureDrafts: Bool = true
    @State private var busy: Bool = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .trailing, spacing: 16) {
                Text("רשומות עבר יישמרו תמיד. בחר מה לעשות ברשומות טיוטה עתידיות:")
                    .foregroundColor(SederTheme.textSecondary)
                VStack(alignment: .trailing) {
                    Toggle("שמור רשומות עתידיות", isOn: Binding(
                        get: { !deleteFutureDrafts },
                        set: { deleteFutureDrafts = !$0 }
                    ))
                    Toggle("מחק רשומות טיוטה עתידיות שלא שולמו", isOn: $deleteFutureDrafts)
                }
                Spacer()
                Button(role: .destructive) {
                    Task {
                        busy = true
                        let ok = await viewModel.delete(id: job.id, deleteFutureDrafts: deleteFutureDrafts)
                        busy = false
                        if ok { dismiss() }
                    }
                } label: {
                    Text(busy ? "מוחק..." : "מחק").frame(maxWidth: .infinity)
                }
                .disabled(busy)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle("מחיקת סדרה: \(job.title)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
    }
}
