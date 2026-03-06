import SwiftUI

struct CurrencyText: View {
    let amount: Double
    var font: Font = .body
    var color: Color = .primary

    var body: some View {
        Text(formatted)
            .font(font.monospacedDigit())
            .foregroundStyle(color)
            .environment(\.layoutDirection, .leftToRight)
    }

    private var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "ILS"
        formatter.currencySymbol = "₪"
        formatter.maximumFractionDigits = 0
        formatter.locale = Locale(identifier: "he_IL")
        return formatter.string(from: NSNumber(value: amount)) ?? "₪\(Int(amount))"
    }
}
