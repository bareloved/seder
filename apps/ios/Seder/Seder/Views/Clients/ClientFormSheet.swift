import SwiftUI

struct ClientFormSheet: View {
    @ObservedObject var viewModel: ClientsViewModel
    @Environment(\.dismiss) var dismiss

    var editingClient: Client?

    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var notes = ""
    @State private var defaultRate = ""
    @State private var isSaving = false

    private var isEditing: Bool { editingClient != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Name
                    fieldSection(label: "שם", icon: "person") {
                        TextField("שם הלקוח", text: $name)
                            .font(SederTheme.ploni(18))
                    }

                    // Email
                    fieldSection(label: "אימייל", icon: "envelope") {
                        TextField("אימייל", text: $email)
                            .font(SederTheme.ploni(18))
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .autocapitalization(.none)
                            .environment(\.layoutDirection, .leftToRight)
                            .multilineTextAlignment(.trailing)
                    }

                    // Phone
                    fieldSection(label: "טלפון", icon: "phone") {
                        TextField("טלפון", text: $phone)
                            .font(SederTheme.ploni(18))
                            .keyboardType(.phonePad)
                            .textContentType(.telephoneNumber)
                            .environment(\.layoutDirection, .leftToRight)
                            .multilineTextAlignment(.trailing)
                    }

                    // Default Rate
                    fieldSection(label: "תעריף ברירת מחדל", icon: "banknote") {
                        HStack {
                            TextField("0", text: $defaultRate)
                                .font(.system(size: 18, weight: .regular, design: .rounded).monospacedDigit())
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .environment(\.layoutDirection, .leftToRight)
                            Text("₪")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundStyle(SederTheme.textTertiary)
                        }
                    }

                    // Notes
                    fieldSection(label: "הערות", icon: "text.quote") {
                        TextField("הערות", text: $notes, axis: .vertical)
                            .font(SederTheme.ploni(18))
                            .lineLimit(3...6)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }
            .background(SederTheme.pageBg)
            .navigationTitle(isEditing ? "עריכת לקוח" : "לקוח חדש")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "עדכון" : "הוספה") {
                        Task { await save() }
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(SederTheme.brandGreen)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
            .onAppear { populateFromClient() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Field Section

    private func fieldSection<Content: View>(label: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
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

    // MARK: - Actions

    private func populateFromClient() {
        guard let client = editingClient else { return }
        name = client.name
        email = client.email ?? ""
        phone = client.phone ?? ""
        notes = client.notes ?? ""
        if let rate = client.defaultRate?.doubleValue, rate > 0 {
            defaultRate = String(Int(rate))
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let trimmedEmail = email.trimmingCharacters(in: .whitespaces)
        let trimmedPhone = phone.trimmingCharacters(in: .whitespaces)
        let trimmedNotes = notes.trimmingCharacters(in: .whitespaces)
        let rate = Double(defaultRate)

        if let client = editingClient {
            if await viewModel.updateClient(
                client.id,
                name: trimmedName,
                email: trimmedEmail.isEmpty ? nil : trimmedEmail,
                phone: trimmedPhone.isEmpty ? nil : trimmedPhone,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                defaultRate: rate
            ) {
                dismiss()
            }
        } else {
            let request = CreateClientRequest(
                name: trimmedName,
                email: trimmedEmail.isEmpty ? nil : trimmedEmail,
                phone: trimmedPhone.isEmpty ? nil : trimmedPhone,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                defaultRate: rate
            )
            if await viewModel.createClient(request) {
                dismiss()
            }
        }
    }
}
