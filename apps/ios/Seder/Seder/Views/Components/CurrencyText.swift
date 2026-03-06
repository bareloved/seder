import SwiftUI

struct CurrencyText: View {
    let amount: Double
    var font: Font = .body
    var color: Color = .primary

    var body: some View {
        Text(formatted)
            .font(font)
            .foregroundStyle(color)
    }

    private var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "ILS"
        formatter.currencySymbol = "₪"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "₪\(Int(amount))"
    }
}
