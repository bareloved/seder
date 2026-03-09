import SwiftUI

enum SortColumn: String, CaseIterable {
    case date, description, amount, client, category, status

    var label: String {
        switch self {
        case .date: return "תאריך"
        case .description: return "תיאור"
        case .amount: return "סכום"
        case .client: return "לקוח"
        case .category: return "קטגוריה"
        case .status: return "סטטוס"
        }
    }
}

enum SortDirection {
    case asc, desc

    var icon: String {
        self == .asc ? "arrow.up" : "arrow.down"
    }
}

struct FilterSheet: View {
    @Environment(\.dismiss) var dismiss

    @Binding var searchQuery: String
    @Binding var selectedCategoryId: String?
    @Binding var selectedClientName: String?
    @Binding var sortColumn: SortColumn
    @Binding var sortDirection: SortDirection

    var categories: [Category]
    var clientNames: [String]

    @State private var showCategoryPicker = false
    @State private var showClientPicker = false
    @State private var showSortPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Search
                HStack {
                    TextField("חיפוש...", text: $searchQuery)
                        .font(SederTheme.ploni(18))
                        .multilineTextAlignment(.leading)
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(SederTheme.textSecondary)
                }
                .padding(12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )

                // Categories
                VStack(alignment: .leading, spacing: 8) {
                    Text("קטגוריות")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Button { showCategoryPicker.toggle() } label: {
                        HStack {
                            if let catId = selectedCategoryId, let cat = categories.first(where: { $0.id == catId }) {
                                HStack(spacing: 8) {
                                    Image(systemName: SederTheme.sfSymbol(for: cat.icon))
                                        .font(.system(size: 14))
                                        .foregroundStyle(SederTheme.categoryColor(for: cat.color))
                                    Text(cat.name)
                                        .font(SederTheme.ploni(18))
                                        .foregroundStyle(SederTheme.textPrimary)
                                }
                            } else {
                                Text("כל הקטגוריות")
                                    .font(SederTheme.ploni(18))
                                    .foregroundStyle(SederTheme.textPrimary)
                            }
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(SederTheme.textTertiary)
                        }
                        .padding(12)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                    }
                }

                // Clients
                VStack(alignment: .leading, spacing: 8) {
                    Text("לקוחות")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Button { showClientPicker.toggle() } label: {
                        HStack {
                            Text(selectedClientName ?? "כל הלקוחות")
                                .font(SederTheme.ploni(18))
                                .foregroundStyle(SederTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(SederTheme.textTertiary)
                        }
                        .padding(12)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                    }
                }

                // Sort
                VStack(alignment: .leading, spacing: 8) {
                    Text("מיון")
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textSecondary)

                    Button { showSortPicker.toggle() } label: {
                        HStack {
                            HStack(spacing: 6) {
                                Image(systemName: sortDirection.icon)
                                    .font(.system(size: 11))
                                    .foregroundStyle(SederTheme.textSecondary)
                                Text(sortColumn.label)
                                    .font(SederTheme.ploni(18))
                                    .foregroundStyle(SederTheme.textPrimary)
                                Image(systemName: "arrow.up.arrow.down")
                                    .font(.system(size: 12))
                                    .foregroundStyle(SederTheme.textTertiary)
                            }
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(SederTheme.textTertiary)
                        }
                        .padding(12)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                    }
                }

                Spacer()
            }
            .padding(16)
            .background(SederTheme.pageBg)
            .navigationTitle("סינון")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
            .sheet(isPresented: $showCategoryPicker) {
                categoryPickerSheet
            }
            .sheet(isPresented: $showClientPicker) {
                clientPickerSheet
            }
            .sheet(isPresented: $showSortPicker) {
                sortPickerSheet
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Category Picker

    private var categoryPickerSheet: some View {
        NavigationStack {
            List {
                Button {
                    selectedCategoryId = nil
                    showCategoryPicker = false
                } label: {
                    HStack {
                        Text("כל הקטגוריות")
                            .font(SederTheme.ploni(18))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        if selectedCategoryId == nil {
                            Image(systemName: "checkmark")
                                .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                }

                ForEach(categories) { cat in
                    Button {
                        selectedCategoryId = cat.id
                        showCategoryPicker = false
                    } label: {
                        HStack {
                            HStack(spacing: 8) {
                                Image(systemName: SederTheme.sfSymbol(for: cat.icon))
                                    .font(.system(size: 14))
                                    .foregroundStyle(SederTheme.categoryColor(for: cat.color))
                                    .frame(width: 24)
                                Text(cat.name)
                                    .font(SederTheme.ploni(18))
                                    .foregroundStyle(SederTheme.textPrimary)
                            }
                            Spacer()
                            if selectedCategoryId == cat.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(SederTheme.brandGreen)
                            }
                        }
                    }
                }
            }
            .navigationTitle("קטגוריות")
            .navigationBarTitleDisplayMode(.inline)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .presentationDetents([.medium])
    }

    // MARK: - Client Picker

    private var clientPickerSheet: some View {
        NavigationStack {
            List {
                Button {
                    selectedClientName = nil
                    showClientPicker = false
                } label: {
                    HStack {
                        Text("כל הלקוחות")
                            .font(SederTheme.ploni(18))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        if selectedClientName == nil {
                            Image(systemName: "checkmark")
                                .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                }

                ForEach(clientNames, id: \.self) { name in
                    Button {
                        selectedClientName = name
                        showClientPicker = false
                    } label: {
                        HStack {
                            Text(name)
                                .font(SederTheme.ploni(18))
                                .foregroundStyle(SederTheme.textPrimary)
                            Spacer()
                            if selectedClientName == name {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(SederTheme.brandGreen)
                            }
                        }
                    }
                }
            }
            .navigationTitle("לקוחות")
            .navigationBarTitleDisplayMode(.inline)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .presentationDetents([.medium])
    }

    // MARK: - Sort Picker

    private var sortPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(SortColumn.allCases, id: \.self) { col in
                    Button {
                        if sortColumn == col {
                            sortDirection = sortDirection == .asc ? .desc : .asc
                        } else {
                            sortColumn = col
                            sortDirection = .asc
                        }
                        showSortPicker = false
                    } label: {
                        HStack {
                            Text(col.label)
                                .font(SederTheme.ploni(18, weight: sortColumn == col ? .semibold : .regular))
                                .foregroundStyle(SederTheme.textPrimary)
                            Spacer()
                            if sortColumn == col {
                                Image(systemName: sortDirection.icon)
                                    .font(.system(size: 12))
                                    .foregroundStyle(SederTheme.brandGreen)
                            }
                        }
                    }
                }
            }
            .navigationTitle("מיון")
            .navigationBarTitleDisplayMode(.inline)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .presentationDetents([.medium])
    }
}
