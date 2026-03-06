import SwiftUI

struct IncomeFormSheet: View {
    @ObservedObject var viewModel: IncomeViewModel
    @Environment(\.dismiss) var dismiss

    var editingEntry: IncomeEntry?

    @State private var date = Date()
    @State private var description = ""
    @State private var clientName = ""
    @State private var amountGross = ""
    @State private var amountPaid = ""
    @State private var vatRate = "18"
    @State private var includesVat = true
    @State private var invoiceStatus: InvoiceStatus = .draft
    @State private var paymentStatus: PaymentStatus = .unpaid
    @State private var notes = ""
    @State private var isSaving = false

    private var isEditing: Bool { editingEntry != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("פרטי הכנסה") {
                    DatePicker("תאריך", selection: $date, displayedComponents: .date)
                        .environment(\.calendar, Calendar(identifier: .gregorian))
                        .tint(SederTheme.brandGreen)

                    TextField("תיאור", text: $description)

                    TextField("שם לקוח", text: $clientName)

                    HStack {
                        TextField("סכום ברוטו", text: $amountGross)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("₪")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        TextField("סכום ששולם", text: $amountPaid)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("₪")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("מע״מ") {
                    HStack {
                        TextField("אחוז מע״מ", text: $vatRate)
                            .keyboardType(.decimalPad)
                            .environment(\.layoutDirection, .leftToRight)
                        Text("%")
                            .foregroundStyle(.secondary)
                    }
                    Toggle("כולל מע״מ", isOn: $includesVat)
                        .tint(SederTheme.brandGreen)
                }

                Section("סטטוס") {
                    Picker("סטטוס חשבונית", selection: $invoiceStatus) {
                        ForEach(InvoiceStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status)
                        }
                    }
                    .tint(SederTheme.brandGreen)

                    Picker("סטטוס תשלום", selection: $paymentStatus) {
                        ForEach(PaymentStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status)
                        }
                    }
                    .tint(SederTheme.brandGreen)
                }

                Section("הערות") {
                    TextField("הערות", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(isEditing ? "עריכת הכנסה" : "הכנסה חדשה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "עדכון" : "שמירה") {
                        Task { await save() }
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(SederTheme.brandGreen)
                    .disabled(description.isEmpty || amountGross.isEmpty || isSaving)
                }
            }
            .onAppear { populateFromEntry() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func populateFromEntry() {
        guard let entry = editingEntry else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let d = formatter.date(from: entry.date) { date = d }
        description = entry.description
        clientName = entry.clientName
        amountGross = entry.amountGross
        amountPaid = entry.amountPaid
        vatRate = entry.vatRate
        includesVat = entry.includesVat
        invoiceStatus = entry.invoiceStatus
        paymentStatus = entry.paymentStatus
        notes = entry.notes ?? ""
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: date)

        if let entry = editingEntry {
            let request = UpdateIncomeRequest(
                date: dateStr,
                description: description,
                clientName: clientName,
                amountGross: Double(amountGross),
                amountPaid: Double(amountPaid),
                vatRate: Double(vatRate),
                includesVat: includesVat,
                invoiceStatus: invoiceStatus.rawValue,
                paymentStatus: paymentStatus.rawValue,
                notes: notes.isEmpty ? nil : notes
            )
            if await viewModel.updateEntry(entry.id, request) {
                dismiss()
            }
        } else {
            let request = CreateIncomeRequest(
                date: dateStr,
                description: description,
                clientName: clientName,
                amountGross: Double(amountGross) ?? 0,
                notes: notes.isEmpty ? nil : notes
            )
            if await viewModel.createEntry(request) {
                dismiss()
            }
        }
    }
}
