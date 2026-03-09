import SwiftUI

struct StatusBadge: View {
    let text: String
    let color: Color
    var icon: String = ""

    var body: some View {
        HStack(spacing: 3) {
            if !icon.isEmpty {
                Image(systemName: icon)
                    .font(.system(size: 9, weight: .medium))
            }
            Text(text)
                .font(SederTheme.ploni(11, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
