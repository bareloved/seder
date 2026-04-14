import SwiftUI

struct RollingJobFormSheet: View {
    enum Mode {
        case create
        case edit(RollingJob)
    }

    let mode: Mode
    @ObservedObject var viewModel: RollingJobsViewModel
    let clients: [Client]
    let categories: [Category]
    @Environment(\.dismiss) private var dismiss

    @State private var title: String = ""
    @State private var description: String = ""
    @State private var clientName: String = ""
    @State private var clientId: String? = nil
    @State private var categoryId: String? = nil
    @State private var amountGross: String = ""
    @State private var vatRate: String = "18"
    @State private var includesVat: Bool = true
    @State private var cadence: Cadence = .weekly(
        interval: 1,
        weekdays: [Calendar.current.component(.weekday, from: Date()) - 1]
    )
    @State private var startDate: Date = Date()
    @State private var endDate: Date? = nil
    @State private var hasEndDate: Bool = false
    @State private var notes: String = ""
    @State private var submitting: Bool = false

    private var isEdit: Bool {
        if case .edit = mode { return true } else { return false }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("פרטים") {
                    TextField("שם הסדרה", text: $title)
                    TextField("תיאור (על כל רשומה)", text: $description)
                }

                Section("לקוח") {
                    Picker("לקוח", selection: $clientId) {
                        Text("—").tag(String?.none)
                        ForEach(clients) { c in
                            Text(c.name).tag(String?.some(c.id))
                        }
                    }
                    .onChange(of: clientId) { _, newValue in
                        if let id = newValue, let c = clients.first(where: { $0.id == id }) {
                            clientName = c.name
                        }
                    }
                    TextField("או שם חופשי", text: $clientName)
                }

                Section("קטגוריה") {
                    Picker("קטגוריה", selection: $categoryId) {
                        Text("—").tag(String?.none)
                        ForEach(categories) { c in
                            Text(c.name).tag(String?.some(c.id))
                        }
                    }
                }

                Section("סכום") {
                    TextField("סכום (₪)", text: $amountGross)
                        .keyboardType(.decimalPad)
                    TextField("מע\"מ %", text: $vatRate)
                        .keyboardType(.decimalPad)
                    Toggle("כולל מע\"מ", isOn: $includesVat)
                }

                Section("תדירות") {
                    CadencePickerView(cadence: $cadence)
                }

                Section("תאריכים") {
                    DatePicker("תאריך התחלה", selection: $startDate, displayedComponents: .date)
                    Toggle("תאריך סיום", isOn: $hasEndDate)
                    if hasEndDate {
                        DatePicker("עד", selection: Binding(
                            get: { endDate ?? Date() },
                            set: { endDate = $0 }
                        ), displayedComponents: .date)
                    }
                }

                Section("הערות") {
                    TextField("", text: $notes, axis: .vertical)
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle(isEdit ? "עריכת סדרה" : "סדרה חדשה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEdit ? "עדכון" : "יצירה") {
                        Task { await save() }
                    }
                    .disabled(submitting || title.isEmpty || description.isEmpty || amountGross.isEmpty)
                }
            }
            .onAppear(perform: populate)
        }
    }

    private func populate() {
        if case .edit(let job) = mode {
            title = job.title
            description = job.description
            clientName = job.clientName
            clientId = job.clientId
            categoryId = job.categoryId
            amountGross = job.amountGross
            vatRate = job.vatRate
            includesVat = job.includesVat
            cadence = job.cadence
            let iso = ISO8601DateFormatter()
            if let d = iso.date(from: job.startDate + "T12:00:00Z") { startDate = d }
            if let e = job.endDate, let d = iso.date(from: e + "T12:00:00Z") {
                endDate = d
                hasEndDate = true
            }
            notes = job.notes ?? ""
        }
    }

    private func dateString(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }

    private func save() async {
        submitting = true
        defer { submitting = false }

        let input = CreateRollingJobInput(
            title: title,
            description: description,
            clientId: clientId,
            clientName: clientName,
            categoryId: categoryId,
            amountGross: amountGross,
            vatRate: vatRate,
            includesVat: includesVat,
            cadence: cadence,
            startDate: dateString(startDate),
            endDate: hasEndDate ? endDate.map(dateString) : nil,
            notes: notes.isEmpty ? nil : notes
        )

        let ok: Bool
        switch mode {
        case .create:
            ok = await viewModel.create(input)
        case .edit(let job):
            let update = UpdateRollingJobInput(
                title: input.title,
                description: input.description,
                clientId: input.clientId,
                clientName: input.clientName,
                categoryId: input.categoryId,
                amountGross: input.amountGross,
                vatRate: input.vatRate,
                includesVat: input.includesVat,
                cadence: input.cadence,
                startDate: input.startDate,
                endDate: input.endDate,
                notes: input.notes
            )
            ok = await viewModel.update(id: job.id, update)
        }

        if ok { dismiss() }
    }
}
