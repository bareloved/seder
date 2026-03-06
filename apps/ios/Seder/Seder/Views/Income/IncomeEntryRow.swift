import SwiftUI

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var onMarkSent: (() -> Void)?
    var onMarkPaid: (() -> Void)?

    var body: some View {
        HStack(spacing: 0) {
            // Color accent bar
            RoundedRectangle(cornerRadius: 2)
                .fill(accentBarColor)
                .frame(width: 4)
                .padding(.vertical, 4)

            VStack(alignment: .trailing, spacing: 8) {
                // Top row: description + amount
                HStack {
                    CurrencyText(
                        amount: entry.grossAmount,
                        font: .system(.title3, design: .rounded).bold(),
                        color: entry.paymentStatus == .paid ? SederTheme.paidColor : .primary
                    )
                    Spacer()
                    Text(entry.description)
                        .font(.headline)
                        .lineLimit(1)
                }

                // Middle row: client + date
                HStack {
                    Text(formattedDate)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Spacer()
                    if !entry.clientName.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "person")
                                .font(.caption2)
                            Text(entry.clientName)
                                .font(.subheadline)
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                // Bottom row: status badges + category
                HStack(spacing: 6) {
                    Spacer()
                    StatusBadge(
                        text: entry.invoiceStatus.label,
                        color: invoiceStatusColor,
                        icon: invoiceStatusIcon
                    )
                    StatusBadge(
                        text: entry.paymentStatus.label,
                        color: paymentStatusColor,
                        icon: paymentStatusIcon
                    )
                    if let cat = entry.categoryData {
                        CategoryChip(name: cat.name, colorName: cat.color)
                    }
                }
            }
            .padding(.leading, 12)
        }
        .padding(.vertical, 6)
        .swipeActions(edge: .leading) {
            if entry.invoiceStatus == .draft {
                Button("נשלח") { onMarkSent?() }
                    .tint(SederTheme.sentColor)
            }
            if entry.paymentStatus != .paid {
                Button("שולם") { onMarkPaid?() }
                    .tint(SederTheme.paidColor)
            }
        }
    }

    private var accentBarColor: Color {
        switch entry.invoiceStatus {
        case .draft: return SederTheme.draftColor
        case .sent: return SederTheme.sentColor
        case .paid: return SederTheme.paidColor
        case .cancelled: return SederTheme.cancelledColor
        }
    }

    private var invoiceStatusColor: Color {
        switch entry.invoiceStatus {
        case .draft: return SederTheme.draftColor
        case .sent: return SederTheme.sentColor
        case .paid: return SederTheme.paidColor
        case .cancelled: return SederTheme.cancelledColor
        }
    }

    private var invoiceStatusIcon: String {
        switch entry.invoiceStatus {
        case .draft: return "doc"
        case .sent: return "paperplane"
        case .paid: return "checkmark.circle"
        case .cancelled: return "xmark.circle"
        }
    }

    private var paymentStatusColor: Color {
        switch entry.paymentStatus {
        case .unpaid: return SederTheme.unpaidColor
        case .partial: return SederTheme.partialColor
        case .paid: return SederTheme.paidColor
        }
    }

    private var paymentStatusIcon: String {
        switch entry.paymentStatus {
        case .unpaid: return "clock"
        case .partial: return "chart.pie"
        case .paid: return "checkmark.seal"
        }
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: entry.date) else { return entry.date }
        let display = DateFormatter()
        display.locale = Locale(identifier: "he_IL")
        display.dateFormat = "d MMM"
        return display.string(from: date)
    }
}

struct CategoryChip: View {
    let name: String
    let colorName: String?

    var body: some View {
        Text(name)
            .font(.caption2.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(SederTheme.categoryColor(for: colorName).opacity(0.12))
            .foregroundStyle(SederTheme.categoryColor(for: colorName))
            .clipShape(Capsule())
    }
}
