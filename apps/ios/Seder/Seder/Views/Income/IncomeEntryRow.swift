import SwiftUI

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var onMarkSent: (() -> Void)?
    var onMarkPaid: (() -> Void)?
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Date box (FIRST = right side in RTL, matching web)
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
            VStack(alignment: .trailing, spacing: 0) {
                // Row 1: Description + Amount
                HStack(alignment: .top) {
                    CurrencyText(
                        amount: entry.grossAmount,
                        font: .system(.body, design: .rounded).bold(),
                        color: entry.paymentStatus == .paid ? SederTheme.paidColor : SederTheme.textPrimary
                    )
                    Spacer()
                    Text(entry.description)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SederTheme.textPrimary)
                        .lineLimit(1)
                }

                // Row 2: Client name
                if !entry.clientName.isEmpty {
                    Text(entry.clientName)
                        .font(.caption)
                        .foregroundStyle(SederTheme.textSecondary)
                        .padding(.top, 2)
                }

                // Row 3: Category + Status badge + menu
                HStack(spacing: 6) {
                    // Menu button (left side in RTL = physical left)
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

                    Spacer()

                    // Overdue indicator
                    if isOverdue {
                        Text("מאחר")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color(red: 0.70, green: 0.15, blue: 0.15))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.99, green: 0.88, blue: 0.88))
                            .clipShape(Capsule())
                    }

                    // Status badge
                    StatusBadge(
                        text: displayStatusLabel,
                        color: displayStatusColor,
                        icon: displayStatusIcon
                    )

                    // Category chip
                    if let cat = entry.categoryData {
                        CategoryChip(name: cat.name, colorName: cat.color)
                    } else {
                        Text("-")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textTertiary)
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

    // MARK: - Display status (combined invoice + payment)

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
        HStack(spacing: 3) {
            Text(name)
                .font(.system(size: 11, weight: .medium))
            Image(systemName: "slider.horizontal.3")
                .font(.system(size: 9))
        }
        .foregroundStyle(SederTheme.textPrimary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(SederTheme.categoryColor(for: colorName).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}
