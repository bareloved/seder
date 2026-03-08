import SwiftUI

struct CurrencyText: View {
    let amount: Double
    var size: CGFloat = 17
    var weight: Font.Weight = .regular
    var color: Color = .primary

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 1) {
            Text("₪")
                .font(.system(size: size * 0.45, weight: weight, design: .rounded))
            Text(formattedNumber)
                .font(.system(size: size, weight: weight, design: .rounded).monospacedDigit())
        }
        .foregroundStyle(color)
        .tracking(-1.5)
        .environment(\.layoutDirection, .leftToRight)
    }

    private var formattedNumber: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.locale = Locale(identifier: "he_IL")
        return formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
    }
}
