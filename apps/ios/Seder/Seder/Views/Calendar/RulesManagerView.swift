import SwiftUI

struct RulesManagerView: View {
    @ObservedObject var viewModel: CalendarImportViewModel
    @Environment(\.dismiss) var dismiss
    @State private var activeTab = "work"
    @State private var newKeyword = ""

    private var activeRuleIndex: Int? {
        viewModel.rules.firstIndex(where: {
            $0.type == activeTab && $0.matchType == "title"
        })
    }

    private var activeKeywords: [String] {
        guard let i = activeRuleIndex else { return [] }
        return viewModel.rules[i].keywords
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Tabs
                Picker("", selection: $activeTab) {
                    Text("אישי").tag("personal")
                    Text("עבודה").tag("work")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)

                // Keywords
                ScrollView {
                    FlowLayout(spacing: 8) {
                        ForEach(activeKeywords, id: \.self) { keyword in
                            HStack(spacing: 4) {
                                Button { removeKeyword(keyword) } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(SederTheme.textTertiary)
                                }
                                Text(keyword)
                                    .font(SederTheme.ploni(14))
                                    .foregroundStyle(SederTheme.textPrimary)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(SederTheme.cardBg)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(SederTheme.cardBorder, lineWidth: 1))
                        }
                    }
                    .padding(.horizontal, 16)
                }

                // Add keyword
                HStack {
                    Button { addKeyword() } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                    .disabled(newKeyword.trimmingCharacters(in: .whitespaces).isEmpty)

                    TextField("הוסף מילת מפתח...", text: $newKeyword)
                        .font(SederTheme.ploni(16))
                        .multilineTextAlignment(.leading)
                        .onSubmit { addKeyword() }
                }
                .padding(12)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(SederTheme.cardBorder, lineWidth: 1))
                .padding(.horizontal, 16)

                // Reset button
                Button {
                    viewModel.rules = ClassificationEngine.defaultRules
                } label: {
                    Text("איפוס לברירת מחדל")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(.red)
                }

                Spacer()
            }
            .padding(.top, 8)
            .navigationTitle("כללי סינון")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task {
                            await viewModel.saveRules()
                            dismiss()
                        }
                    } label: {
                        Text("שמירה")
                            .font(SederTheme.ploni(16, weight: .semibold))
                            .foregroundStyle(SederTheme.brandGreen)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func addKeyword() {
        let keyword = newKeyword.trimmingCharacters(in: .whitespaces)
        guard !keyword.isEmpty, let i = activeRuleIndex else { return }
        if !viewModel.rules[i].keywords.contains(keyword) {
            viewModel.rules[i].keywords.append(keyword)
        }
        newKeyword = ""
    }

    private func removeKeyword(_ keyword: String) {
        guard let i = activeRuleIndex else { return }
        viewModel.rules[i].keywords.removeAll { $0 == keyword }
    }
}

// MARK: - Flow Layout (for keyword badges)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
