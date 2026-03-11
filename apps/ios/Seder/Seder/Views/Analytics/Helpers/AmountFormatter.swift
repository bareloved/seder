import Foundation

enum AmountFormatter {
    /// Abbreviated Hebrew month names for chart X-axis
    static let abbreviatedMonths = [
        1: "ינו׳", 2: "פבר׳", 3: "מרץ", 4: "אפר׳", 5: "מאי", 6: "יוני",
        7: "יולי", 8: "אוג׳", 9: "ספט׳", 10: "אוק׳", 11: "נוב׳", 12: "דצמ׳",
    ]

    /// Format amount as ₪X.Xk for chart labels
    static func abbreviated(_ amount: Double) -> String {
        if amount >= 1000 {
            let k = amount / 1000
            if k == k.rounded() {
                return "₪\(Int(k))k"
            }
            return "₪\(String(format: "%.1f", k))k"
        }
        return "₪\(Int(amount))"
    }

    /// Number part only for abbreviated amounts (no ₪)
    static func abbreviatedNumber(_ amount: Double) -> String {
        if amount >= 1000 {
            let k = amount / 1000
            if k == k.rounded() {
                return "\(Int(k))k"
            }
            return "\(String(format: "%.1f", k))k"
        }
        return "\(Int(amount))"
    }

    /// Full formatted amount with thousands separator
    static func full(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.locale = Locale(identifier: "he_IL")
        let number = formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
        return "₪\(number)"
    }

    /// Month name from month number
    static func monthName(_ month: Int) -> String {
        abbreviatedMonths[month] ?? ""
    }
}
