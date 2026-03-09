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
                                        .font(SederTheme.ploni(16))
                                        .foregroundStyle(clientName.isEmpty ? SederTheme.textTertiary : SederTheme.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 12))
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
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .environment(\.calendar, Calendar(identifier: .gregorian))
                                .environment(\.locale, Locale(identifier: "he_IL"))
                                .tint(SederTheme.brandGreen)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, 10)
                                .background(SederTheme.subtleBg)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                                )
                        }
                    }

                    // Row 2: Description
                    fieldColumn(label: "תיאור עבודה", icon: "doc.text") {
                        TextField("תיאור", text: $description)
                            .font(SederTheme.ploni(16))
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
                                    .font(.system(size: 14, weight: .medium, design: .rounded))
                                    .foregroundStyle(SederTheme.textTertiary)
                                Spacer()
                                TextField("0", text: $amountGross)
                                    .font(.system(size: 18, weight: .medium, design: .rounded).monospacedDigit())
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                    .environment(\.layoutDirection, .leftToRight)
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
                            Menu {
                                Button("ללא קטגוריה") { selectedCategoryId = nil }
                                ForEach(categories) { cat in
                                    Button(cat.name) { selectedCategoryId = cat.id }
                                }
                            } label: {
                                HStack {
                                    Text(selectedCategoryName)
                                        .font(SederTheme.ploni(16))
                                        .foregroundStyle(selectedCategoryId == nil ? SederTheme.textTertiary : SederTheme.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 12))
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
                    }

                    // Row 4: Notes
                    fieldColumn(label: "הערות", icon: "text.quote") {
                        TextField("הערות", text: $notes, axis: .vertical)
                            .font(SederTheme.ploni(16))
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
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            // Physical RIGHT in RTL: title
            Text("פרטי עבודה")
                .font(SederTheme.ploni(20, weight: .semibold))
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
        .padding(.vertical, 14)
    }

    // MARK: - Field Column Helper

    private func fieldColumn<Content: View>(label: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text(label)
                    .font(SederTheme.ploni(13, weight: .medium))
                    .foregroundStyle(SederTheme.textSecondary)
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundStyle(SederTheme.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            content()
        }
    }

    // MARK: - Helpers

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
