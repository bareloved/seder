import SwiftUI

struct ExpandableSection<Content: View, Badge: View>: View {
    let title: String
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: (() -> Void)?
    @ViewBuilder let badge: () -> Badge
    @ViewBuilder let content: () -> Content

    init(
        title: String,
        isExpanded: Bool,
        hasError: Bool = false,
        onToggle: @escaping () -> Void,
        onRetry: (() -> Void)? = nil,
        @ViewBuilder badge: @escaping () -> Badge = { EmptyView() },
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.isExpanded = isExpanded
        self.hasError = hasError
        self.onToggle = onToggle
        self.onRetry = onRetry
        self.badge = badge
        self.content = content
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button(action: onToggle) {
                HStack {
                    Text(title)
                        .font(SederTheme.ploni(16, weight: .semibold))
                        .foregroundStyle(SederTheme.textPrimary)

                    Spacer()

                    if !isExpanded {
                        badge()
                    }

                    Image(systemName: isExpanded ? "chevron.down" : "chevron.left")
                        .font(.caption)
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Divider()
                    .padding(.horizontal, 12)

                if hasError {
                    // Error state
                    VStack(spacing: 8) {
                        Text("שגיאה בטעינה")
                            .font(SederTheme.ploni(14))
                            .foregroundStyle(SederTheme.textSecondary)
                        if let onRetry {
                            Button("נסה שוב") {
                                onRetry()
                            }
                            .font(SederTheme.ploni(14, weight: .medium))
                            .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                    .padding(.vertical, 16)
                } else {
                    content()
                }
            }
        }
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
        .animation(.easeInOut(duration: 0.2), value: isExpanded)
    }
}
