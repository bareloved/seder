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
                    .font(SederTheme.ploni(13))
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

    var body: some View {
        VStack(spacing: 3) {
            HStack {
                Text(category.categoryName)
                    .font(SederTheme.ploni(12, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                Spacer()
                Text("\(AmountFormatter.full(category.amount)) (\(Int(category.percentage))%)")
                    .font(SederTheme.ploni(12))
                    .foregroundStyle(SederTheme.textSecondary)
            }

            GeometryReader { geo in
                ZStack(alignment: .trailing) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.subtleBg)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.color(hex: category.categoryColor))
                        .frame(width: geo.size.width * (category.percentage / 100), height: 8)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .frame(height: 8)
        }
    }
}
