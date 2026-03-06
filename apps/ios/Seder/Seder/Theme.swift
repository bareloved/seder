import SwiftUI

enum SederTheme {
    // Brand
    static let brandGreen = Color(red: 0.18, green: 0.80, blue: 0.44) // #2ecc71
    static let brandGreenDark = Color(red: 0.15, green: 0.68, blue: 0.38) // #27ae60
    static let brandGreenDeep = Color(red: 0.12, green: 0.52, blue: 0.29) // #1e8449

    // Status - Invoice
    static let draftColor = Color(red: 0.05, green: 0.65, blue: 0.89) // sky-500
    static let sentColor = Color(red: 0.95, green: 0.55, blue: 0.15) // orange-500
    static let paidColor = Color(red: 0.20, green: 0.78, blue: 0.35) // emerald-500
    static let cancelledColor = Color(red: 0.85, green: 0.25, blue: 0.25) // red-500

    // Status - Payment
    static let unpaidColor = Color(red: 0.85, green: 0.25, blue: 0.25) // red-500
    static let partialColor = Color(red: 0.95, green: 0.55, blue: 0.15) // orange-500

    // KPI card backgrounds (light, translucent)
    static let kpiGross = Color(red: 0.38, green: 0.45, blue: 0.56) // slate
    static let kpiPaid = Color(red: 0.20, green: 0.78, blue: 0.35) // emerald
    static let kpiUnpaid = Color(red: 0.85, green: 0.25, blue: 0.25) // red
    static let kpiVat = Color(red: 0.38, green: 0.45, blue: 0.56) // slate
    static let kpiInvoice = Color(red: 0.95, green: 0.55, blue: 0.15) // orange
    static let kpiJobs = Color(red: 0.05, green: 0.65, blue: 0.89) // sky

    // Category colors
    static let categoryColors: [(name: String, color: Color)] = [
        ("emerald", Color(red: 0.20, green: 0.78, blue: 0.35)),
        ("indigo", Color(red: 0.39, green: 0.40, blue: 0.95)),
        ("sky", Color(red: 0.05, green: 0.65, blue: 0.89)),
        ("amber", Color(red: 0.96, green: 0.72, blue: 0.15)),
        ("purple", Color(red: 0.66, green: 0.33, blue: 0.97)),
        ("blue", Color(red: 0.23, green: 0.51, blue: 0.96)),
        ("rose", Color(red: 0.96, green: 0.30, blue: 0.46)),
        ("teal", Color(red: 0.08, green: 0.73, blue: 0.65)),
        ("orange", Color(red: 0.95, green: 0.55, blue: 0.15)),
        ("pink", Color(red: 0.93, green: 0.28, blue: 0.67)),
        ("cyan", Color(red: 0.06, green: 0.78, blue: 0.82)),
    ]

    static func categoryColor(for name: String?) -> Color {
        guard let name else { return .gray }
        return categoryColors.first { $0.name == name }?.color ?? .gray
    }
}
