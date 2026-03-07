import SwiftUI

// In RTL layout:
// - .leading = physical RIGHT
// - .trailing = physical LEFT
// - First HStack item = physical RIGHT
// - Last HStack item = physical LEFT

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var onMarkSent: (() -> Void)?
    var onMarkPaid: (() -> Void)?
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Date box — first = physical RIGHT in RTL
            VStack(spacing: 1) {
                Text("\(dayNumber)")
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(SederTheme.textPrimary)
                Text(weekdayName)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(SederTheme.textTertiary)
            }
            .frame(width: 48, height: 48)
            .background(SederTheme.subtleBg)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            // Main content
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: Description (right) + Amount (left)
                HStack(alignment: .top) {
                    // Description — first = physical RIGHT in RTL
                    Text(entry.description)
                        .font(SederTheme.ploni(15, weight: .semibold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .lineLimit(1)
                    Spacer()
                    // Amount — last = physical LEFT in RTL
                    CurrencyText(
                        amount: entry.grossAmount,
                        size: 18,
                        weight: .medium,
                        color: entry.paymentStatus == .paid ? SederTheme.paidColor : SederTheme.textPrimary
                    )
                }

                // Row 2: Client name (right-aligned via .leading in RTL)
                if !entry.clientName.isEmpty {
                    Text(entry.clientName)
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.top, 2)
                }

                // Row 3: Category + Status (right) ... menu (left)
                HStack(spacing: 8) {
                    // Category chip — first = physical RIGHT
                    if let cat = entry.categoryData {
                        CategoryChip(name: cat.name, colorName: cat.color)
                    } else {
                        Text("-")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textTertiary)
                    }

                    // Status badge
                    StatusBadge(
                        text: displayStatusLabel,
                        color: displayStatusColor,
                        icon: displayStatusIcon
                    )

                    // Overdue indicator
                    if isOverdue {
                        Text("מאחר")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Color(red: 0.70, green: 0.15, blue: 0.15))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.99, green: 0.88, blue: 0.88))
                            .clipShape(Capsule())
                    }

                    Spacer()

                    // Menu button — last = physical LEFT
                    Menu {
                        if entry.invoiceStatus == .draft {
                            Button { onMarkSent?() } label: {
                                Label("סמן כנשלח", systemImage: "paperplane")
                            }
                        }
                        if entry.paymentStatus != .paid {
                            Button { onMarkPaid?() } label: {
                                Label("סמן כשולם", systemImage: "checkmark.circle")
                            }
                        }
                        Divider()
                        Button(role: .destructive) { onDelete?() } label: {
                            Label("מחיקה", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textTertiary)
                            .frame(width: 24, height: 24)
                    }
                }
                .padding(.top, 8)
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
        return date < Calendar.current.startOfDay(for: Date())
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
