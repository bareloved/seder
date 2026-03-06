import SwiftUI

struct CategoriesView: View {
    @StateObject private var viewModel = CategoriesViewModel()
    @State private var showAdd = false
    @State private var newName = ""
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else {
                    List {
                        ForEach(viewModel.categories) { cat in
                            HStack {
                                Text(cat.name)
                                    .font(.body)
                                Spacer()
                                Circle()
                                    .fill(categoryColor(cat.color))
                                    .frame(width: 12, height: 12)
                            }
                        }
                        .onMove(perform: viewModel.moveCategory)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("קטגוריות")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
            .alert("קטגוריה חדשה", isPresented: $showAdd) {
                TextField("שם הקטגוריה", text: $newName)
                Button("ביטול", role: .cancel) { newName = "" }
                Button("הוספה") {
                    Task {
                        await viewModel.createCategory(
                            CreateCategoryRequest(name: newName, color: "blue", icon: "Circle")
                        )
                        newName = ""
                    }
                }
            }
            .task { await viewModel.loadCategories() }
        }
    }

    private func categoryColor(_ name: String) -> Color {
        switch name {
        case "emerald": return .green
        case "indigo": return .indigo
        case "sky": return .cyan
        case "amber": return .orange
        case "purple": return .purple
        case "blue": return .blue
        case "rose": return .pink
        case "teal": return .teal
        case "orange": return .orange
        case "pink": return .pink
        case "cyan": return .cyan
        default: return .gray
        }
    }
}
