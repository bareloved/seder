import SwiftUI

struct ExportDataSheet: View {
    @ObservedObject var viewModel: SettingsViewModel
    @Environment(\.dismiss) var dismiss
    @State private var exportType = "both"
    @State private var dateRange = "all"
    @State private var showShareSheet = false
    @State private var csvData: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // What to export
                VStack(alignment: .leading, spacing: 8) {
                    Text("מה לייצא")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Picker("", selection: $exportType) {
                        Text("הכנסות").tag("income")
                        Text("קטגוריות").tag("categories")
                        Text("הכל").tag("both")
                    }
                    .pickerStyle(.segmented)
                }

                // Date range
                VStack(alignment: .leading, spacing: 8) {
                    Text("טווח תאריכים")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Picker("", selection: $dateRange) {
                        Text("החודש").tag("thisMonth")
                        Text("השנה").tag("thisYear")
                        Text("הכל").tag("all")
                    }
                    .pickerStyle(.segmented)
                }

                if let error = errorMessage {
                    Text(error)
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(.red)
                }

                Spacer()

                Button {
                    Task { await doExport() }
                } label: {
                    if viewModel.isExporting {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("ייצוא")
                            .font(SederTheme.ploni(18, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(SederTheme.brandGreen)
                .disabled(viewModel.isExporting)
            }
            .padding(16)
            .navigationTitle("ייצוא נתונים")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let csv = csvData {
                    ShareSheet(items: [csvFileURL(from: csv)])
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func doExport() async {
        errorMessage = nil
        let includeIncome = exportType == "income" || exportType == "both"
        let includeCats = exportType == "categories" || exportType == "both"

        if let csv = await viewModel.exportData(
            includeIncome: includeIncome,
            includeCategories: includeCats,
            dateRange: dateRange
        ) {
            csvData = csv
            showShareSheet = true
        } else {
            errorMessage = "אין נתונים לייצוא"
        }
    }

    private func csvFileURL(from content: String) -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("seder-export.csv")
        try? content.write(to: fileURL, atomically: true, encoding: .utf8)
        return fileURL
    }
}

// MARK: - UIKit Share Sheet wrapper

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
