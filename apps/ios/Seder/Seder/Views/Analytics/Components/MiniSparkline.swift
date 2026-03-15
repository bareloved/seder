import SwiftUI

struct MiniSparkline: View {
    let values: [Double]

    private var maxValue: Double {
        max(values.max() ?? 1, 1)
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 1.5) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                RoundedRectangle(cornerRadius: 1)
                    .fill(value > 0 ? SederTheme.brandGreen : SederTheme.subtleBg)
                    .frame(width: 4, height: max(2, CGFloat(value / maxValue) * 32))
            }
        }
        .frame(height: 34)
    }
}
