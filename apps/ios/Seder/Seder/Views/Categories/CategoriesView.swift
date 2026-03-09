import SwiftUI

struct CategoriesView: View {
    @StateObject private var viewModel = CategoriesViewModel()
    @State private var showFormSheet = false
    @State private var editingCategory: Category?
    @State private var isEditMode = false
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.categories.isEmpty {
                    emptyState
                } else {
                    categoryList
                }
            }
            .background(SederTheme.pageBg)
            .navigationTitle("קטגוריות")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !viewModel.categories.isEmpty {
                        Button {
                            withAnimation { isEditMode.toggle() }
                        } label: {
                            Image(systemName: isEditMode ? "checkmark.circle.fill" : "pencil")
                                .foregroundStyle(isEditMode ? SederTheme.brandGreen : SederTheme.textSecondary)
                        }
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
            .sheet(isPresented: $showFormSheet) {
                CategoryFormSheet(
                    viewModel: viewModel,
                    editingCategory: editingCategory
                )
                .presentationDetents([.medium, .large])
            }
            .task { await viewModel.loadCategories() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Category List

    private var categoryList: some View {
        List {
            ForEach(viewModel.categories) { cat in
                categoryRow(cat)
                    .swipeActions(edge: .leading, allowsFullSwipe: false) {
                        Button {
                            editingCategory = cat
                            showFormSheet = true
                        } label: {
                            Label("עריכה", systemImage: "pencil")
                        }
                        .tint(SederTheme.brandGreen)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { _ = await viewModel.archiveCategory(cat.id) }
                        } label: {
                            Label("מחיקה", systemImage: "trash")
                        }
                    }
            }
            .onMove(perform: viewModel.moveCategory)

            // Add new category button at end of list
            Button {
                editingCategory = nil
                showFormSheet = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .medium))
                    Text("קטגוריה חדשה")
                        .font(SederTheme.ploni(16))
                }
                .foregroundStyle(SederTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 8)
            }
            .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
        .environment(\.editMode, isEditMode ? .constant(.active) : .constant(.inactive))
    }

    // MARK: - Category Row

    private func categoryRow(_ cat: Category) -> some View {
        HStack(spacing: 12) {
            // Icon with color background
            Image(systemName: SederTheme.sfSymbol(for: cat.icon))
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(SederTheme.categoryColor(for: cat.color))
                .frame(width: 32, height: 32)
                .background(SederTheme.categoryColor(for: cat.color).opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Name
            Text(cat.name)
                .font(SederTheme.ploni(17))
                .foregroundStyle(SederTheme.textPrimary)

            Spacer()
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            editingCategory = cat
            showFormSheet = true
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag")
                .font(.system(size: 40))
                .foregroundStyle(SederTheme.textTertiary)

            Text("אין קטגוריות")
                .font(SederTheme.ploni(18, weight: .medium))
                .foregroundStyle(SederTheme.textSecondary)

            Text("הוסף קטגוריות כדי לארגן את ההכנסות שלך")
                .font(SederTheme.ploni(15))
                .foregroundStyle(SederTheme.textTertiary)
                .multilineTextAlignment(.center)

            Button {
                editingCategory = nil
                showFormSheet = true
            } label: {
                Text("הוסף קטגוריה")
                    .font(SederTheme.ploni(16, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(SederTheme.brandGreen)
                    .clipShape(Capsule())
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
