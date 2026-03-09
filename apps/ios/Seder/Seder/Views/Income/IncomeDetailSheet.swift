import SwiftUI

struct IncomeDetailSheet: View {
    @ObservedObject var viewModel: IncomeViewModel
    let entry: IncomeEntry
    var categories: [Category]
    var clientNames: [String]
    @Environment(\.dismiss) var dismiss

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
    @FocusState private var amountFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header
            Divider()

            ScrollView {
                VStack(spacing: 20) {
                    // Row 1: Client (RIGHT) + Date (LEFT)
                    HStack(spacing: 12) {
                        // Client — first = physical RIGHT in RTL
                        fieldColumn(label: "לקוח", icon: "person") {
                            Menu {
                                Button("ללא לקוח") { clientName = "" }
                                ForEach(clientNames, id: \.self) { name in
                                    Button(name) { clientName = name }
                                }
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
                                .background(SederTheme.subtleBg)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                            }
                        }

                        // Date — last = physical LEFT in RTL
                        fieldColumn(label: "תאריך", icon: "calendar") {
                            Button {
                                showDatePicker.toggle()
                            } label: {
                                Text(date.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "he_IL"))))
                                    .font(SederTheme.ploni(18))
                                    .foregroundStyle(SederTheme.textPrimary)
                                    .frame(maxWidth: .infinity)
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
                    }

                    // Row 2: Description
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

                    // Row 3: Amount (RIGHT) + Category (LEFT)
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
                                        // Strip decimal point and anything after
                                        if let dotIndex = amountGross.firstIndex(of: ".") {
                                            amountGross = String(amountGross[..<dotIndex])
                                        }
                                        if let dotIndex = amountGross.firstIndex(of: ",") {
                                            amountGross = String(amountGross[..<dotIndex])
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

                    // Row 4: Notes
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
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }

            Spacer()

            // Close button
            Button {
                Task { await save() }
            } label: {
                Text("סגור")
                    .font(SederTheme.ploni(17, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                    .padding(.vertical, 12)
            }
            .disabled(isSaving)
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
            Text("פרטי עבודה")
                .font(SederTheme.ploni(22, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)

            Spacer()

            // Physical LEFT in RTL: status icons + close
            HStack(spacing: 8) {
                StatusBadge(
                    text: entry.invoiceStatus.label,
                    color: statusColor,
                    icon: statusIcon
                )

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
        if entry.paymentStatus == .paid { return SederTheme.paidColor }
        if entry.invoiceStatus == .sent { return SederTheme.sentColor }
        return SederTheme.draftColor
    }

    private var statusIcon: String {
        if entry.paymentStatus == .paid { return "checkmark" }
        if entry.invoiceStatus == .sent { return "paperplane.fill" }
        return ""
    }

    private func populateFromEntry() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let d = formatter.date(from: entry.date) { date = d }
        description = entry.description
        clientName = entry.clientName
        amountGross = entry.amountGross
        selectedCategoryId = entry.categoryId
        notes = entry.notes ?? ""
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: date)

        let request = UpdateIncomeRequest(
            date: dateStr,
            description: description,
            clientName: clientName,
            amountGross: Double(amountGross),
            categoryId: selectedCategoryId,
            notes: notes.isEmpty ? nil : notes
        )

        if await viewModel.updateEntry(entry.id, request) {
            dismiss()
        }
    }
}
