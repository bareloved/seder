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

    // Header (darkens in dark mode like web app)
    static var headerBg: Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0.06, green: 0.28, blue: 0.15, alpha: 1)
                : UIColor(red: 0.18, green: 0.80, blue: 0.44, alpha: 1)
        })
    }

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

    // Ploni font (matching web app)
    static func ploni(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold, .heavy, .black:
            return .custom("PloniDL1.1AAA-Bold", size: size)
        case .semibold:
            return .custom("PloniDL1.1AAA-D-Bold", size: size)
        case .medium:
            return .custom("PloniDL1.1AAA-Medium", size: size)
        default:
            return .custom("PloniDL1.1AAA-Regular", size: size)
        }
    }

    // Category colors
    static func categoryColor(for name: String?) -> Color {
        guard let name else { return .gray }
        switch name {
        case "emerald": return Color(red: 0.20, green: 0.78, blue: 0.52)
        case "indigo": return Color(red: 0.45, green: 0.36, blue: 0.85)
        case "sky": return Color(red: 0.33, green: 0.64, blue: 0.95)
        case "amber": return Color(red: 0.90, green: 0.72, blue: 0.15)
        case "purple": return Color(red: 0.62, green: 0.35, blue: 0.85)
        case "slate": return Color(red: 0.60, green: 0.60, blue: 0.62)
        case "blue": return Color(red: 0.35, green: 0.55, blue: 0.96)
        case "rose": return Color(red: 0.92, green: 0.30, blue: 0.45)
        case "teal": return Color(red: 0.18, green: 0.72, blue: 0.65)
        case "orange": return Color(red: 0.95, green: 0.45, blue: 0.20)
        case "pink": return Color(red: 0.90, green: 0.30, blue: 0.60)
        case "cyan": return Color(red: 0.20, green: 0.72, blue: 0.82)
        default: return .gray
        }
    }

    // Hex color string → Color
    static func color(hex: String) -> Color {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard h.count == 6, let int = UInt64(h, radix: 16) else { return .gray }
        return Color(
            red: Double((int >> 16) & 0xFF) / 255,
            green: Double((int >> 8) & 0xFF) / 255,
            blue: Double(int & 0xFF) / 255
        )
    }

    // Lucide icon name → SF Symbol mapping
    static func sfSymbol(for lucideIcon: String?) -> String {
        guard let icon = lucideIcon?.lowercased() else { return "circle" }
        switch icon {
        case "sparkles": return "sparkles"
        case "slidershorizontal": return "slider.horizontal.3"
        case "mic2": return "mic.fill"
        case "bookopen": return "book.fill"
        case "layers": return "square.3.layers.3d"
        case "circle": return "circle"
        case "music": return "music.note"
        case "headphones": return "headphones"
        case "guitar": return "guitars.fill"
        case "piano": return "pianokeys"
        case "drum": return "music.note.list"
        case "radio": return "radio.fill"
        case "video": return "video.fill"
        case "camera": return "camera.fill"
        case "briefcase": return "briefcase.fill"
        case "graduationcap": return "graduationcap.fill"
        case "users": return "person.2.fill"
        case "calendar": return "calendar"
        case "star": return "star.fill"
        case "heart": return "heart.fill"
        case "zap": return "bolt.fill"
        case "trophy": return "trophy.fill"
        default: return "circle"
        }
    }
}
