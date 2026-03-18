import SwiftUI

struct BatchActionBar: View {
    let selectedCount: Int
    let isLoading: Bool
    let onMarkPaid: () -> Void
    let onMarkSent: () -> Void
    let onDelete: () -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 16) {
                // Close button + count — physical RIGHT in RTL
                HStack(spacing: 8) {
                    Button(action: onClose) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                    Text("נבחרו \(selectedCount)")
                        .font(SederTheme.ploni(14, weight: .medium))
                        .foregroundStyle(SederTheme.textSecondary)
                }

                Spacer()

                // Action buttons — physical LEFT in RTL
                HStack(spacing: 12) {
                    batchButton(
                        icon: "checkmark.circle",
                        label: "שולם",
                        color: SederTheme.paidColor,
                        action: onMarkPaid
                    )
                    batchButton(
                        icon: "paperplane",
                        label: "נשלח",
                        color: SederTheme.sentColor,
                        action: onMarkSent
                    )
                    batchButton(
                        icon: "trash",
                        label: "מחק",
                        color: .red,
                        action: onDelete
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(.ultraThinMaterial)
        .allowsHitTesting(!isLoading)
        .opacity(isLoading ? 0.6 : 1)
    }

    @ViewBuilder
    private func batchButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(color)
            .frame(width: 48, height: 40)
        }
    }
}
