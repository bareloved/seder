import SwiftUI

enum SederTheme {
    // Brand
    static let brandGreen = Color(red: 0.18, green: 0.80, blue: 0.44) // #2ecc71
    static let brandGreenDark = Color(red: 0.15, green: 0.68, blue: 0.38) // #27ae60

    // Status - Invoice (matching web Tailwind colors)
    static let draftColor = Color(red: 0.02, green: 0.53, blue: 0.82) // sky-600
    static let sentColor = Color(red: 0.92, green: 0.34, blue: 0.05) // orange-600
    static let paidColor = Color(red: 0.02, green: 0.59, blue: 0.41) // emerald-600
    static let cancelledColor = Color(red: 0.86, green: 0.15, blue: 0.15) // red-600

    // Status - Payment
    static let unpaidColor = Color(red: 0.86, green: 0.15, blue: 0.15) // red-600
    static let partialColor = Color(red: 0.92, green: 0.34, blue: 0.05) // orange-600

    // Adaptive colors (light/dark)
    static var pageBg: Color { Color(.systemGroupedBackground) }
    static var cardBg: Color { Color(.secondarySystemGroupedBackground) }
    static var cardBorder: Color { Color(.separator).opacity(0.3) }

    // Text (adaptive via UIKit dynamic colors)
    static var textPrimary: Color { Color(.label) }
    static var textSecondary: Color { Color(.secondaryLabel) }
    static var textTertiary: Color { Color(.tertiaryLabel) }

    // Subtle backgrounds
    static var subtleBg: Color { Color(.systemGray6) }

    // Category colors
    static func categoryColor(for name: String?) -> Color {
        guard let name else { return .gray }
        switch name {
        case "emerald": return paidColor
        case "indigo": return Color(red: 0.31, green: 0.33, blue: 0.85)
        case "sky": return draftColor
        case "amber": return Color(red: 0.85, green: 0.65, blue: 0.01)
        case "purple": return Color(red: 0.58, green: 0.25, blue: 0.83)
        case "blue": return Color(red: 0.23, green: 0.51, blue: 0.96)
        case "rose": return Color(red: 0.88, green: 0.17, blue: 0.34)
        case "teal": return Color(red: 0.05, green: 0.60, blue: 0.53)
        case "orange": return sentColor
        case "pink": return Color(red: 0.85, green: 0.21, blue: 0.58)
        case "cyan": return Color(red: 0.05, green: 0.65, blue: 0.68)
        default: return .gray
        }
    }
}
