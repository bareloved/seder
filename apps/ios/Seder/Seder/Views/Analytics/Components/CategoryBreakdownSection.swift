import SwiftUI

struct CategoryBreakdownSection: View {
    let categories: [CategoryBreakdown]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "פילוח לפי קטגוריה",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry
        ) {
            if categories.isEmpty {
                Text("אין נתונים")
                    .font(SederTheme.ploni(14))
                    .foregroundStyle(SederTheme.textTertiary)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 10) {
                    ForEach(categories, id: \.categoryName) { cat in
                        CategoryBar(category: cat)
                    }
                }
                .padding(12)
            }
        }
    }
}

private struct CategoryBar: View {
    let category: CategoryBreakdown

    private func resolveColor(_ value: String) -> Color {
        // Try name mapping first (e.g. "emerald"), then hex fallback (e.g. "#9ca3af")
        let named = SederTheme.categoryColor(for: value)
        if named != .gray { return named }
        return SederTheme.color(hex: value)
    }

    var body: some View {
        VStack(spacing: 3) {
            HStack {
                Text(category.categoryName)
                    .font(SederTheme.ploni(14, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                Spacer()
                Text("\(AmountFormatter.full(category.amount)) (\(Int(category.percentage))%)")
                    .font(SederTheme.ploni(13))
                    .foregroundStyle(SederTheme.textSecondary)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.subtleBg)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(resolveColor(category.categoryColor))
                        .frame(width: geo.size.width * (category.percentage / 100), height: 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .frame(height: 8)
        }
    }
}
