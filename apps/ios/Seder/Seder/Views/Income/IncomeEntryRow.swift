import SwiftUI

// In RTL layout:
// - .leading = physical RIGHT
// - .trailing = physical LEFT
// - First HStack item = physical RIGHT
// - Last HStack item = physical LEFT

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var isSelectionMode: Bool = false
    var isSelected: Bool = false
    var onRollingJobTap: ((String) -> Void)? = nil

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Selection checkbox — first = physical RIGHT in RTL
            if isSelectionMode {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? SederTheme.brandGreen : SederTheme.textTertiary)
                    .frame(width: 28, height: 44)
                    .transition(.scale.combined(with: .opacity))
            }

            // Date box — physical RIGHT in RTL
            VStack(spacing: 1) {
                Text("\(dayNumber)")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(SederTheme.textPrimary)
                Text(weekdayName)
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(SederTheme.textTertiary)
            }
            .frame(width: 28, height: 44)
            .background(Color(.systemGray6).opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 6))

            // Main content
            VStack(alignment: .leading, spacing: 4) {
                // Row 1: Description+Client (right) + Amount+Status (left)
                HStack(alignment: .top, spacing: 4) {
                    // Description + Client — physical RIGHT in RTL
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(entry.description)
                                .font(SederTheme.ploni(18, weight: .semibold))
                                .foregroundStyle(SederTheme.textPrimary)
                                .lineLimit(2)
                            if let rollingJobId = entry.rollingJobId {
                                let detached = entry.detachedFromTemplate ?? false
                                Button {
                                    onRollingJobTap?(rollingJobId)
                                } label: {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(
                                            detached
                                                ? SederTheme.textTertiary
                                                : Color(red: 0.02, green: 0.53, blue: 0.82)
                                        )
                                        .frame(width: 22, height: 22)
                                        .background(
                                            detached
                                                ? Color(.systemGray6)
                                                : Color(red: 0.90, green: 0.95, blue: 1.0)
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 6)
                                                .stroke(
                                                    detached
                                                        ? SederTheme.cardBorder
                                                        : Color(red: 0.75, green: 0.87, blue: 0.98),
                                                    lineWidth: 1
                                                )
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(detached ? "נותק מתבנית הסדרה" : "ערוך סדרה")
                            }
                        }
                        if !entry.clientName.isEmpty {
                            Text(entry.clientName)
                                .font(SederTheme.ploni(15))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                    }
                    Spacer()
                    // Amount + Status — physical LEFT in RTL
                    VStack(alignment: .trailing) {
                        CurrencyText(
                            amount: entry.grossAmount,
                            size: 20,
                            weight: .medium,
                            color: entry.paymentStatus == .paid ? SederTheme.paidColor : SederTheme.textPrimary
                        )
                        Spacer()
                        HStack(spacing: 4) {
                            StatusBadge(
                                text: displayStatusLabel,
                                color: displayStatusColor,
                                icon: displayStatusIcon
                            )
                            if isOverdue {
                                Text("מאחר")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundStyle(Color(red: 0.70, green: 0.15, blue: 0.15))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(red: 0.99, green: 0.88, blue: 0.88))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                // Row 2: Category ... menu
                HStack(spacing: 8) {
                    // Category chip — first = physical RIGHT
                    if let cat = entry.categoryData {
                        CategoryChip(name: cat.name, colorName: cat.color)
                    } else {
                        Text("-")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textTertiary)
                    }

                    Spacer()
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
    }

    // MARK: - Display status

    private var displayStatusLabel: String {
        if entry.paymentStatus == .paid { return "שולם" }
        if entry.invoiceStatus == .sent { return "נשלח" }
        return entry.invoiceStatus.label
    }

    private var displayStatusColor: Color {
        if entry.paymentStatus == .paid { return SederTheme.paidColor }
        if entry.invoiceStatus == .sent { return SederTheme.sentColor }
        switch entry.invoiceStatus {
        case .draft: return SederTheme.draftColor
        case .sent: return SederTheme.sentColor
        case .paid: return SederTheme.paidColor
        case .cancelled: return SederTheme.cancelledColor
        }
    }

    private var displayStatusIcon: String {
        if entry.paymentStatus == .paid { return "checkmark" }
        if entry.invoiceStatus == .sent { return "paperplane.fill" }
        return ""
    }

    private var isOverdue: Bool {
        guard entry.paymentStatus != .paid,
              entry.invoiceStatus == .sent else { return false }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: entry.date) else { return false }
        let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        return date < Calendar.current.startOfDay(for: thirtyDaysAgo)
    }

    private var dayNumber: Int {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: entry.date) else { return 0 }
        return Calendar.current.component(.day, from: date)
    }

    private var weekdayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: entry.date) else { return "" }
        let weekdays = ["", "ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
        let weekday = Calendar.current.component(.weekday, from: date)
        return weekdays[weekday]
    }
}

struct CategoryChip: View {
    let name: String
    let colorName: String?

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "slider.horizontal.3")
                .font(.system(size: 8))
            Text(name)
                .font(.system(size: 10, weight: .medium))
        }
        .foregroundStyle(SederTheme.textPrimary)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(SederTheme.categoryColor(for: colorName).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
