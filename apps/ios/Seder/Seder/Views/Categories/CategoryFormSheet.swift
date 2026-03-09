import SwiftUI

struct CategoryFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    @Environment(\.dismiss) var dismiss

    var editingCategory: Category?

    @State private var name = ""
    @State private var selectedColor = "emerald"
    @State private var selectedIcon = "Sparkles"
    @State private var isSaving = false

    private var isEditing: Bool { editingCategory != nil }

    // 12 colors matching web app
    static let colors: [(id: String, label: String)] = [
        ("emerald", "ירוק"),
        ("indigo", "אינדיגו"),
        ("sky", "תכלת"),
        ("amber", "ענבר"),
        ("purple", "סגול"),
        ("slate", "אפור"),
        ("blue", "כחול"),
        ("rose", "ורוד"),
        ("teal", "טורקיז"),
        ("orange", "כתום"),
        ("pink", "ורוד"),
        ("cyan", "ציאן"),
    ]

    // 22 icons matching web app (Lucide names → SF Symbols)
    static let icons: [(lucide: String, sf: String)] = [
        ("Sparkles", "sparkles"),
        ("SlidersHorizontal", "slider.horizontal.3"),
        ("Mic2", "mic.fill"),
        ("BookOpen", "book.fill"),
        ("Layers", "square.3.layers.3d"),
        ("Circle", "circle"),
        ("Music", "music.note"),
        ("Headphones", "headphones"),
        ("Guitar", "guitars.fill"),
        ("Piano", "pianokeys"),
        ("Drum", "music.note.list"),
        ("Radio", "radio.fill"),
        ("Video", "video.fill"),
        ("Camera", "camera.fill"),
        ("Briefcase", "briefcase.fill"),
        ("GraduationCap", "graduationcap.fill"),
        ("Users", "person.2.fill"),
        ("Calendar", "calendar"),
        ("Star", "star.fill"),
        ("Heart", "heart.fill"),
        ("Zap", "bolt.fill"),
        ("Trophy", "trophy.fill"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Preview badge
                    preview

                    // Name field
                    nameField

                    // Color picker
                    colorPicker

                    // Icon picker
                    iconPicker
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }
            .background(SederTheme.pageBg)
            .navigationTitle(isEditing ? "עריכת קטגוריה" : "קטגוריה חדשה")
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
            .onAppear { populateFromCategory() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Preview

    private var preview: some View {
        HStack(spacing: 8) {
            Image(systemName: SederTheme.sfSymbol(for: selectedIcon))
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white)
            Text(name.isEmpty ? "שם הקטגוריה" : name)
                .font(SederTheme.ploni(16, weight: .medium))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(SederTheme.categoryColor(for: selectedColor))
        .clipShape(Capsule())
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    // MARK: - Name Field

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("שם")
                .font(SederTheme.ploni(15, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            TextField("שם הקטגוריה", text: $name)
                .font(SederTheme.ploni(18))
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

    // MARK: - Color Picker

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("צבע")
                .font(SederTheme.ploni(15, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 6), spacing: 12) {
                ForEach(Self.colors, id: \.id) { color in
                    Button {
                        selectedColor = color.id
                    } label: {
                        Circle()
                            .fill(SederTheme.categoryColor(for: color.id))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: 3)
                                    .padding(2)
                                    .opacity(selectedColor == color.id ? 1 : 0)
                            )
                            .overlay(
                                Circle()
                                    .stroke(SederTheme.categoryColor(for: color.id), lineWidth: 2)
                                    .padding(-2)
                                    .opacity(selectedColor == color.id ? 1 : 0)
                            )
                    }
                }
            }
        }
    }

    // MARK: - Icon Picker

    private var iconPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("אייקון")
                .font(SederTheme.ploni(15, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6), spacing: 10) {
                ForEach(Self.icons, id: \.lucide) { icon in
                    Button {
                        selectedIcon = icon.lucide
                    } label: {
                        Image(systemName: icon.sf)
                            .font(.system(size: 18))
                            .foregroundStyle(
                                selectedIcon == icon.lucide
                                    ? SederTheme.categoryColor(for: selectedColor)
                                    : SederTheme.textTertiary
                            )
                            .frame(width: 44, height: 44)
                            .background(
                                selectedIcon == icon.lucide
                                    ? SederTheme.categoryColor(for: selectedColor).opacity(0.15)
                                    : SederTheme.subtleBg
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(
                                        selectedIcon == icon.lucide
                                            ? SederTheme.categoryColor(for: selectedColor)
                                            : SederTheme.cardBorder,
                                        lineWidth: selectedIcon == icon.lucide ? 2 : 1
                                    )
                            )
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func populateFromCategory() {
        guard let cat = editingCategory else { return }
        name = cat.name
        selectedColor = cat.color
        selectedIcon = cat.icon
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let trimmedName = name.trimmingCharacters(in: .whitespaces)

        if let cat = editingCategory {
            if await viewModel.updateCategory(cat.id, name: trimmedName, color: selectedColor, icon: selectedIcon) {
                dismiss()
            }
        } else {
            let request = CreateCategoryRequest(name: trimmedName, color: selectedColor, icon: selectedIcon)
            if await viewModel.createCategory(request) {
                dismiss()
            }
        }
    }
}
