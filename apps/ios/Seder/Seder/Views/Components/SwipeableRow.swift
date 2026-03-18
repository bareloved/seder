import SwiftUI

struct SwipeAction {
    let label: String
    let icon: String
    let color: Color
    let action: () -> Void
}

/// Custom swipeable row for use inside ScrollView/LazyVStack.
///
/// In this RTL app:
/// - Swipe LEFT → reveals `leadingActions` on the RIGHT (mark paid/sent)
/// - Swipe RIGHT → reveals `trailingActions` on the LEFT (delete)
struct SwipeableRow<Content: View>: View {
    let leadingActions: [SwipeAction]
    let trailingActions: [SwipeAction]
    @ViewBuilder let content: () -> Content

    @State private var offset: CGFloat = 0
    @State private var dragStart: CGFloat = 0
    @State private var settling = false

    private let buttonWidth: CGFloat = 72

    // Physical pixel widths
    private var rightWidth: CGFloat { CGFloat(leadingActions.count) * buttonWidth }
    private var leftWidth: CGFloat { CGFloat(trailingActions.count) * buttonWidth }

    var body: some View {
        // Force LTR so all positioning is in physical coordinates.
        // The content() itself still renders RTL from its own environment.
        rowBody
            .environment(\.layoutDirection, .leftToRight)
    }

    private var rowBody: some View {
        ZStack {
            // Physical LEFT side — trailingActions (delete)
            HStack(spacing: 0) {
                ForEach(Array(trailingActions.enumerated()), id: \.offset) { _, action in
                    actionButton(action)
                }
                Spacer()
            }

            // Physical RIGHT side — leadingActions (mark paid/sent)
            HStack(spacing: 0) {
                Spacer()
                ForEach(Array(leadingActions.enumerated()), id: \.offset) { _, action in
                    actionButton(action)
                }
            }

            // Main content on top — restore RTL for the content
            content()
                .environment(\.layoutDirection, .rightToLeft)
                .offset(x: offset)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .highPriorityGesture(
            DragGesture(minimumDistance: 20)
                .onChanged { value in
                    guard !settling else { return }
                    if value.translation.width == 0 { return }

                    // Capture starting offset on first drag event
                    if abs(value.translation.width) < 25 {
                        dragStart = offset
                    }

                    let newOffset = dragStart + value.translation.width
                    offset = min(max(newOffset, -rightWidth), leftWidth)
                }
                .onEnded { value in
                    settling = true
                    let drag = value.translation.width
                    let velocity = value.predictedEndTranslation.width - drag

                    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                        // If was open and dragging back toward center, just close
                        if dragStart != 0 && abs(offset) < abs(dragStart) {
                            offset = 0
                        } else if drag < -40 || velocity < -200, !leadingActions.isEmpty {
                            offset = -rightWidth
                        } else if drag > 40 || velocity > 200, !trailingActions.isEmpty {
                            offset = leftWidth
                        } else {
                            offset = 0
                        }
                    }
                    dragStart = 0
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        settling = false
                    }
                }
        )
    }

    @ViewBuilder
    private func actionButton(_ action: SwipeAction) -> some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                offset = 0
            }
            action.action()
        } label: {
            VStack(spacing: 4) {
                Image(systemName: action.icon)
                    .font(.system(size: 18))
                Text(action.label)
                    .font(.system(size: 11, weight: .medium))
            }
            .foregroundStyle(.white)
            .frame(width: buttonWidth)
            .frame(maxHeight: .infinity)
            .background(action.color)
        }
    }
}
