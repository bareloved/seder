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
    @State private var saveError: String? = nil

    // UI state
    @State private var showStartDatePicker = false
    @State private var showEndDatePicker = false
    @State private var showCategoryPicker = false
    @State private var showClientPicker = false
    @FocusState private var amountFocused: Bool

    private var isEdit: Bool {
        if case .edit = mode { return true } else { return false }
    }

    private var selectedCategory: Category? {
        guard let id = categoryId else { return nil }
        return categories.first { $0.id == id }
    }

    private var selectedCategoryName: String {
        selectedCategory?.name ?? "בחר קטגוריה"
    }

    private var canSubmit: Bool {
        !submitting
            && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !amountGross.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !clientName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()

            ScrollView {
                VStack(spacing: 20) {
                    titleField
                    descriptionField
                    clientField
                    categoryField
                    amountField
                    cadenceSection
                    startDateField
                    endDateField
                    notesField
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)
            }

            saveButton
        }
        .background(SederTheme.pageBg)
        .environment(\.layoutDirection, .rightToLeft)
        .onAppear(perform: populate)
        .alert("לא ניתן לשמור", isPresented: Binding(
            get: { saveError != nil },
            set: { if !$0 { saveError = nil } }
        )) {
            Button("אישור", role: .cancel) { saveError = nil }
        } message: {
            Text(saveError ?? "")
        }
        .sheet(isPresented: $showStartDatePicker) {
            DatePicker("", selection: $startDate, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .environment(\.calendar, Calendar(identifier: .gregorian))
                .environment(\.locale, Locale(identifier: "he_IL"))
                .tint(SederTheme.brandGreen)
                .padding()
                .presentationDetents([.medium])
                .onChange(of: startDate) {
                    showStartDatePicker = false
                }
        }
        .sheet(isPresented: $showEndDatePicker) {
            DatePicker(
                "",
                selection: Binding(
                    get: { endDate ?? Date() },
                    set: { endDate = $0 }
                ),
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .environment(\.calendar, Calendar(identifier: .gregorian))
            .environment(\.locale, Locale(identifier: "he_IL"))
            .tint(SederTheme.brandGreen)
            .padding()
            .presentationDetents([.medium])
            .onChange(of: endDate) {
                showEndDatePicker = false
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(SederTheme.textSecondary)
                    .frame(width: 32, height: 32)
                    .background(SederTheme.subtleBg)
                    .clipShape(Circle())
            }

            Spacer()

            Text(isEdit ? "עריכת סדרה" : "סדרה חדשה")
                .font(SederTheme.ploni(18, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)

            Spacer()

            // Placeholder to balance the X button so title stays centered.
            Color.clear.frame(width: 32, height: 32)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Fields

    private var titleField: some View {
        fieldColumn(label: "שם הסדרה", icon: "arrow.triangle.2.circlepath") {
            TextField("למשל: שיעור שבועי", text: $title)
                .font(SederTheme.ploni(18))
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
        }
    }

    private var descriptionField: some View {
        fieldColumn(label: "תיאור עבודה", icon: "doc.text") {
            TextField("יופיע על כל רשומה", text: $description)
                .font(SederTheme.ploni(18))
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
        }
    }

    private var clientField: some View {
        fieldColumn(label: "לקוח", icon: "person") {
            Button {
                showClientPicker = true
            } label: {
                HStack {
                    Text(clientName.isEmpty ? "בחר לקוח" : clientName)
                        .font(SederTheme.ploni(18))
                        .foregroundStyle(clientName.isEmpty ? SederTheme.textTertiary : SederTheme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14))
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
            }
            .popover(isPresented: $showClientPicker) {
                clientPickerContent
                    .presentationCompactAdaptation(.popover)
            }
        }
    }

    private var categoryField: some View {
        fieldColumn(label: "קטגוריה", icon: "tag") {
            Button {
                showCategoryPicker = true
            } label: {
                HStack(spacing: 8) {
                    if let cat = selectedCategory {
                        Image(systemName: SederTheme.sfSymbol(for: cat.icon))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(SederTheme.categoryColor(for: cat.color))
                    }
                    Text(selectedCategoryName)
                        .font(SederTheme.ploni(18))
                        .foregroundStyle(categoryId == nil ? SederTheme.textTertiary : SederTheme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14))
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
            }
            .popover(isPresented: $showCategoryPicker) {
                categoryPickerContent
                    .presentationCompactAdaptation(.popover)
            }
        }
    }

    private var amountField: some View {
        fieldColumn(label: "סכום", icon: "wallet.bifold") {
            HStack(spacing: 12) {
                // Amount with ₪ symbol — first = physical RIGHT in RTL
                HStack {
                    Text("₪")
                        .font(.system(size: 16, weight: .medium, design: .rounded))
                        .foregroundStyle(SederTheme.textTertiary)
                    Spacer()
                    TextField("0", text: $amountGross)
                        .font(.system(size: 19, weight: .regular, design: .rounded).monospacedDigit())
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .environment(\.layoutDirection, .leftToRight)
                        .focused($amountFocused)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
                .layoutPriority(1)

                // VAT toggle — last = physical LEFT in RTL
                HStack(spacing: 8) {
                    Toggle("", isOn: $includesVat)
                        .labelsHidden()
                        .tint(SederTheme.brandGreen)
                    Text("כולל מע״מ")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(SederTheme.textSecondary)
                        .fixedSize()
                }
            }
        }
    }

    private var cadenceSection: some View {
        fieldColumn(label: "תדירות", icon: "arrow.triangle.2.circlepath") {
            VStack(alignment: .trailing, spacing: 12) {
                CadencePickerView(cadence: $cadence)
            }
            .padding(14)
            .background(SederTheme.subtleBg)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )
        }
    }

    private var startDateField: some View {
        fieldColumn(label: "תאריך התחלה", icon: "calendar") {
            Button {
                showStartDatePicker.toggle()
            } label: {
                Text(startDate.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "he_IL"))))
                    .font(SederTheme.ploni(18))
                    .foregroundStyle(SederTheme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .background(SederTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                    )
            }
        }
    }

    private var endDateField: some View {
        VStack(alignment: .trailing, spacing: 10) {
            Toggle(isOn: $hasEndDate) {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                    Text("תאריך סיום")
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textSecondary)
                }
            }
            .tint(SederTheme.brandGreen)

            if hasEndDate {
                Button {
                    showEndDatePicker.toggle()
                } label: {
                    Text(
                        (endDate ?? Date())
                            .formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "he_IL")))
                    )
                    .font(SederTheme.ploni(17))
                    .foregroundStyle(SederTheme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .background(SederTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(SederTheme.cardBorder, lineWidth: 1)
                    )
                }
            }
        }
    }

    private var notesField: some View {
        fieldColumn(label: "הערות", icon: "text.quote") {
            TextField("הערות", text: $notes, axis: .vertical)
                .font(SederTheme.ploni(18))
                .multilineTextAlignment(.leading)
                .lineLimit(2...5)
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )
        }
    }

    // MARK: - Pickers

    private var clientPickerContent: some View {
        VStack(spacing: 0) {
            ForEach(clients) { c in
                Button {
                    clientId = c.id
                    clientName = c.name
                    showClientPicker = false
                } label: {
                    HStack {
                        Text(c.name)
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        if clientId == c.id {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                Divider().padding(.horizontal, 14)
            }
        }
        .frame(minWidth: 220)
    }

    private var categoryPickerContent: some View {
        VStack(spacing: 0) {
            Button {
                categoryId = nil
                showCategoryPicker = false
            } label: {
                HStack {
                    Text("ללא קטגוריה")
                        .font(SederTheme.ploni(16))
                        .foregroundStyle(SederTheme.textSecondary)
                    Spacer()
                    if categoryId == nil {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            Divider().padding(.horizontal, 14)
            ForEach(categories) { c in
                Button {
                    categoryId = c.id
                    showCategoryPicker = false
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: SederTheme.sfSymbol(for: c.icon))
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SederTheme.categoryColor(for: c.color))
                        Text(c.name)
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        if categoryId == c.id {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                if c.id != categories.last?.id {
                    Divider().padding(.horizontal, 14)
                }
            }
        }
        .frame(minWidth: 220)
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task { await save() }
        } label: {
            Text(isEdit ? "שמור שינויים" : "צור סדרה")
                .font(SederTheme.ploni(17, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(canSubmit ? SederTheme.brandGreen : SederTheme.brandGreen.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
        }
        .disabled(!canSubmit)
    }

    // MARK: - Lifecycle

    private func populate() {
        if case .edit(let job) = mode {
            title = job.title
            description = job.description
            clientName = job.clientName
            clientId = job.clientId
            categoryId = job.categoryId
            amountGross = job.amountGross
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

    // MARK: - Field Column helper (mirrors IncomeDetailSheet)

    @ViewBuilder
    private func fieldColumn<Content: View>(
        label: String,
        icon: String,
        @ViewBuilder content: () -> Content,
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(SederTheme.textTertiary)
                Text(label)
                    .font(SederTheme.ploni(14))
                    .foregroundStyle(SederTheme.textSecondary)
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Save

    private func save() async {
        submitting = true
        defer { submitting = false }

        let trimmedClient = clientName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedClient.isEmpty {
            saveError = "יש לבחור לקוח"
            return
        }
        let amountRaw = amountGross.filter(\.isWholeNumber)
        if amountRaw.isEmpty {
            saveError = "יש להזין סכום"
            return
        }

        let input = CreateRollingJobInput(
            title: String(title.prefix(100)),
            description: description,
            clientId: clientId,
            clientName: trimmedClient,
            categoryId: categoryId,
            amountGross: amountRaw,
            vatRate: "18",
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

        if ok {
            dismiss()
        } else {
            saveError = viewModel.errorMessage ?? "שמירה נכשלה"
        }
    }
}
