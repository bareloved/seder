import SwiftUI

struct IncomeDetailSheet: View {
    @ObservedObject var viewModel: IncomeViewModel
    var entry: IncomeEntry?
    var categories: [Category]
    var clientNames: [String]
    var clientsVM: ClientsViewModel?
    @Environment(\.dismiss) var dismiss

    private var isEditing: Bool { entry != nil }

    @State private var date = Date()
    @State private var description = ""
    @State private var clientName = ""
    @State private var amountGross = ""
    @State private var selectedCategoryId: String?
    @State private var notes = ""
    @State private var isSaving = false
    @State private var showDatePicker = false
    @State private var showCategoryPicker = false
    @State private var previousAmount = ""
    @State private var showClientSuggestions = false
    @State private var isCreatingClient = false
    @FocusState private var amountFocused: Bool
    @FocusState private var clientFocused: Bool

    // Rolling-job (אירוע חוזר) — only shown when creating a new entry
    @State private var isRolling = false
    @State private var cadence: Cadence = .weekly(
        interval: 1,
        weekdays: [Calendar.current.component(.weekday, from: Date()) - 1]
    )
    @State private var rollingEndDate: Date? = nil
    @State private var hasRollingEndDate = false
    @State private var showRollingEndDatePicker = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header
            Divider()

            ScrollView {
                VStack(spacing: 20) {
                    // Row 1: Client (full width with suggestions)
                    fieldColumn(label: "לקוח", icon: "person") {
                        VStack(spacing: 0) {
                            TextField("הקלידו את שם הלקוח", text: $clientName)
                                .font(SederTheme.ploni(18))
                                .multilineTextAlignment(.leading)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                                .background(SederTheme.subtleBg)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(showClientSuggestions ? SederTheme.brandGreen : SederTheme.cardBorder, lineWidth: 1)
                                )
                                .focused($clientFocused)
                                .onChange(of: clientFocused) {
                                    withAnimation(.easeInOut(duration: 0.15)) {
                                        showClientSuggestions = clientFocused
                                    }
                                }

                            if showClientSuggestions {
                                clientSuggestionsView
                            }
                        }
                    }

                    // Row 2: Date (full width)
                    fieldColumn(label: "תאריך", icon: "calendar") {
                        Button {
                            showDatePicker.toggle()
                        } label: {
                            Text(date.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "he_IL"))))
                                .font(SederTheme.ploni(18))
                                .foregroundStyle(SederTheme.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                                .background(SederTheme.subtleBg)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                        }
                    }

                    // Row 3: Description
                    fieldColumn(label: "תיאור עבודה", icon: "doc.text") {
                        TextField("תיאור", text: $description)
                            .font(SederTheme.ploni(18))
                            .multilineTextAlignment(.leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 12)
                            .background(SederTheme.subtleBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(SederTheme.cardBorder, lineWidth: 1)
                            )
                    }

                    // Row 4: Amount (RIGHT) + Category (LEFT)
                    HStack(spacing: 12) {
                        // Amount — first = physical RIGHT in RTL
                        fieldColumn(label: "סכום", icon: "wallet.bifold") {
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
                                    .onChange(of: amountFocused) {
                                        if amountFocused {
                                            previousAmount = amountGross
                                            amountGross = ""
                                        } else if amountGross.isEmpty {
                                            amountGross = previousAmount
                                        }
                                    }
                                    .onChange(of: amountGross) {
                                        let digits = amountGross.filter(\.isWholeNumber)
                                        if let num = Int(digits), digits == String(num) {
                                            let formatter = NumberFormatter()
                                            formatter.numberStyle = .decimal
                                            formatter.groupingSeparator = ","
                                            let formatted = formatter.string(from: NSNumber(value: num)) ?? digits
                                            if amountGross != formatted {
                                                amountGross = formatted
                                            }
                                        } else if digits.isEmpty {
                                            if amountGross != "" { amountGross = "" }
                                        }
                                    }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(SederTheme.subtleBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(SederTheme.cardBorder, lineWidth: 1)
                            )
                        }

                        // Category — last = physical LEFT in RTL
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
                                        .foregroundStyle(selectedCategoryId == nil ? SederTheme.textTertiary : SederTheme.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 14))
                                        .foregroundStyle(SederTheme.textTertiary)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                                .background(SederTheme.subtleBg)
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

                    // Row 5: Notes
                    fieldColumn(label: "הערות", icon: "text.quote") {
                        TextField("הערות", text: $notes, axis: .vertical)
                            .font(SederTheme.ploni(18))
                            .multilineTextAlignment(.leading)
                            .lineLimit(3...6)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 12)
                            .background(SederTheme.subtleBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(SederTheme.cardBorder, lineWidth: 1)
                            )
                    }

                    // Row 6: Recurring event (only for new entries)
                    if !isEditing {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle(isOn: $isRolling.animation(.easeInOut(duration: 0.2))) {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(SederTheme.textSecondary)
                                    Text("אירוע חוזר")
                                        .font(SederTheme.ploni(17, weight: .medium))
                                        .foregroundStyle(SederTheme.textPrimary)
                                }
                            }
                            .tint(SederTheme.brandGreen)

                            if isRolling {
                                VStack(alignment: .trailing, spacing: 12) {
                                    CadencePickerView(cadence: $cadence)

                                    Toggle(isOn: $hasRollingEndDate) {
                                        Text("תאריך סיום")
                                            .font(SederTheme.ploni(15))
                                            .foregroundStyle(SederTheme.textSecondary)
                                    }
                                    .tint(SederTheme.brandGreen)

                                    if hasRollingEndDate {
                                        Button {
                                            showRollingEndDatePicker.toggle()
                                        } label: {
                                            Text(
                                                (rollingEndDate ?? Date())
                                                    .formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "he_IL")))
                                            )
                                            .font(SederTheme.ploni(16))
                                            .foregroundStyle(SederTheme.textPrimary)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 10)
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
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }

            Spacer()

            // Save/Close button
            Button {
                Task { await save() }
            } label: {
                Text(saveButtonLabel)
                    .font(SederTheme.ploni(17, weight: .medium))
                    .foregroundStyle(isEditing ? SederTheme.textPrimary : .white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(isEditing ? Color.clear : SederTheme.brandGreen)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .padding(.horizontal, isEditing ? 0 : 20)
            }
            .disabled(isSaving || (!isEditing && (description.isEmpty || amountGross.isEmpty)))
        }
        .background(SederTheme.pageBg)
        .environment(\.layoutDirection, .rightToLeft)
        .onAppear { populateFromEntry() }
        .sheet(isPresented: $showDatePicker) {
            DatePicker("", selection: $date, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .environment(\.calendar, Calendar(identifier: .gregorian))
                .environment(\.locale, Locale(identifier: "he_IL"))
                .tint(SederTheme.brandGreen)
                .padding()
                .presentationDetents([.medium])
                .onChange(of: date) {
                    showDatePicker = false
                }
        }
        .sheet(isPresented: $showRollingEndDatePicker) {
            DatePicker(
                "",
                selection: Binding(
                    get: { rollingEndDate ?? Date() },
                    set: { rollingEndDate = $0 }
                ),
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .environment(\.calendar, Calendar(identifier: .gregorian))
            .environment(\.locale, Locale(identifier: "he_IL"))
            .tint(SederTheme.brandGreen)
            .padding()
            .presentationDetents([.medium])
            .onChange(of: rollingEndDate) {
                showRollingEndDatePicker = false
            }
        }
    }

    // MARK: - Client Suggestions

    private var filteredClientNames: [String] {
        if clientName.isEmpty {
            return Array(clientNames.prefix(5))
        }
        let q = clientName.lowercased()
        return clientNames.filter { $0.lowercased().contains(q) }
    }

    private var isNewClient: Bool {
        !clientName.isEmpty && !clientNames.contains(where: { $0.lowercased() == clientName.lowercased() })
    }

    private var clientSuggestionsView: some View {
        VStack(spacing: 0) {
            let matches = filteredClientNames

            if !matches.isEmpty {
                ForEach(matches, id: \.self) { name in
                    Button {
                        clientName = name
                        clientFocused = false
                    } label: {
                        HStack(spacing: 8) {
                            Text(name)
                                .font(SederTheme.ploni(16))
                                .foregroundStyle(SederTheme.textPrimary)
                                .lineLimit(1)
                            Spacer()
                            if name == clientName {
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
            } else if !clientName.isEmpty {
                HStack {
                    Text("לא נמצאו לקוחות")
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                Divider().padding(.horizontal, 14)
            }

            // "New client" button
            if isNewClient {
                Button {
                    Task { await createNewClient() }
                } label: {
                    HStack(spacing: 6) {
                        if isCreatingClient {
                            ProgressView()
                                .controlSize(.small)
                                .tint(SederTheme.brandGreen)
                        } else {
                            Image(systemName: "plus")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        Text("+ לקוח חדש: \(clientName)")
                            .font(SederTheme.ploni(16, weight: .medium))
                    }
                    .foregroundStyle(SederTheme.brandGreen)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                .disabled(isCreatingClient)
            }
        }
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.06), radius: 4, y: 2)
    }

    // MARK: - Category Picker

    private var categoryPickerContent: some View {
        VStack(spacing: 4) {
            Button {
                selectedCategoryId = nil
                showCategoryPicker = false
            } label: {
                HStack(spacing: 10) {
                    Text("ללא קטגוריה")
                        .font(SederTheme.ploni(18))
                        .foregroundStyle(SederTheme.textSecondary)
                    Spacer()
                    if selectedCategoryId == nil {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
            Divider().padding(.horizontal, 14)

            ForEach(categories) { cat in
                Button {
                    selectedCategoryId = cat.id
                    showCategoryPicker = false
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: SederTheme.sfSymbol(for: cat.icon))
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SederTheme.categoryColor(for: cat.color))
                            .frame(width: 28, height: 28)
                            .background(SederTheme.categoryColor(for: cat.color).opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        Text(cat.name)
                            .font(SederTheme.ploni(18))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        if selectedCategoryId == cat.id {
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                if cat.id != categories.last?.id {
                    Divider().padding(.horizontal, 14)
                }
            }
        }
        .padding(.vertical, 8)
        .frame(width: 190)
        .fixedSize(horizontal: false, vertical: true)
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            // Physical RIGHT in RTL: title
            Text(isEditing ? "פרטי עבודה" : "עבודה חדשה")
                .font(SederTheme.ploni(22, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)

            Spacer()

            // Physical LEFT in RTL: status icons + close
            HStack(spacing: 8) {
                if let entry {
                    StatusBadge(
                        text: entry.invoiceStatus.label,
                        color: statusColor,
                        icon: statusIcon
                    )
                }

                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(SederTheme.subtleBg)
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .padding(.bottom, 14)
    }

    // MARK: - Field Column Helper

    private func fieldColumn<Content: View>(label: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundStyle(SederTheme.textTertiary)
                Text(label)
                    .font(SederTheme.ploni(15, weight: .medium))
                    .foregroundStyle(SederTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            content()
        }
    }

    // MARK: - Helpers

    private var selectedCategory: Category? {
        guard let id = selectedCategoryId else { return nil }
        return categories.first(where: { $0.id == id })
    }

    private var selectedCategoryName: String {
        if let id = selectedCategoryId,
           let cat = categories.first(where: { $0.id == id }) {
            return cat.name
        }
        return "בחר קטגוריה"
    }

    private var statusColor: Color {
        guard let entry else { return SederTheme.draftColor }
        if entry.paymentStatus == .paid { return SederTheme.paidColor }
        if entry.invoiceStatus == .sent { return SederTheme.sentColor }
        return SederTheme.draftColor
    }

    private var statusIcon: String {
        guard let entry else { return "" }
        if entry.paymentStatus == .paid { return "checkmark" }
        if entry.invoiceStatus == .sent { return "paperplane.fill" }
        return ""
    }

    private func createNewClient() async {
        let name = clientName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty, let clientsVM else { return }
        isCreatingClient = true
        defer { isCreatingClient = false }
        let request = CreateClientRequest(name: name)
        if await clientsVM.createClient(request) {
            clientFocused = false
        }
    }

    private func populateFromEntry() {
        guard let entry else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let d = formatter.date(from: entry.date) { date = d }
        description = entry.description
        clientName = entry.clientName
        if let dbl = Double(entry.amountGross) {
            let num = Int(dbl)
            let fmt = NumberFormatter()
            fmt.numberStyle = .decimal
            fmt.groupingSeparator = ","
            amountGross = fmt.string(from: NSNumber(value: num)) ?? entry.amountGross
        } else {
            amountGross = entry.amountGross
        }
        selectedCategoryId = entry.categoryId
        notes = entry.notes ?? ""
    }

    private var saveButtonLabel: String {
        if isEditing { return "סגור" }
        if isRolling { return "צור אירוע חוזר" }
        return "שמירה"
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: date)
        let rawAmount = amountGross.filter(\.isWholeNumber)

        if let entry {
            let request = UpdateIncomeRequest(
                date: dateStr,
                description: description,
                clientName: clientName,
                amountGross: Double(rawAmount),
                categoryId: selectedCategoryId,
                notes: notes.isEmpty ? nil : notes
            )
            if await viewModel.updateEntry(entry.id, request) {
                dismiss()
            }
            return
        }

        if isRolling {
            let endDateStr: String? = {
                guard hasRollingEndDate, let end = rollingEndDate else { return nil }
                return formatter.string(from: end)
            }()

            let titleValue = String(description.prefix(100))
            let amountString = rawAmount.isEmpty ? "0" : rawAmount

            let input = CreateRollingJobInput(
                title: titleValue,
                description: description,
                clientId: nil,
                clientName: clientName,
                categoryId: selectedCategoryId,
                amountGross: amountString,
                vatRate: "18",
                includesVat: true,
                cadence: cadence,
                startDate: dateStr,
                endDate: endDateStr,
                notes: notes.isEmpty ? nil : notes
            )

            do {
                _ = try await APIClient.shared.createRollingJob(input)
                await viewModel.loadEntries()
                dismiss()
            } catch let error as APIError {
                viewModel.errorMessage = error.errorDescription
            } catch {
                viewModel.errorMessage = "שגיאה ביצירת אירוע חוזר"
            }
            return
        }

        let request = CreateIncomeRequest(
            date: dateStr,
            description: description,
            clientName: clientName,
            amountGross: Double(rawAmount) ?? 0,
            categoryId: selectedCategoryId,
            notes: notes.isEmpty ? nil : notes
        )
        if await viewModel.createEntry(request) {
            dismiss()
        }
    }
}
