import SwiftUI

struct IncomeEntryRow: View {
    let entry: IncomeEntry
    var onMarkSent: (() -> Void)?
    var onMarkPaid: (() -> Void)?

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // Top row: description + amount
            HStack {
                CurrencyText(amount: entry.grossAmount, font: .headline)
                Spacer()
                Text(entry.description)
                    .font(.headline)
                    .lineLimit(1)
            }

            // Middle row: client + date
            HStack {
                Text(entry.date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                if !entry.clientName.isEmpty {
                    Text(entry.clientName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Bottom row: status badges
            HStack(spacing: 8) {
                Spacer()
                StatusBadge(
                    text: entry.invoiceStatus.label,
                    color: invoiceStatusColor
                )
                StatusBadge(
                    text: entry.paymentStatus.label,
                    color: paymentStatusColor
                )
                if let cat = entry.categoryData {
                    Text(cat.name)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.accentColor.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 4)
        .swipeActions(edge: .leading) {
            if entry.invoiceStatus == .draft {
                Button("נשלח") { onMarkSent?() }
                    .tint(.blue)
            }
            if entry.paymentStatus != .paid {
                Button("שולם") { onMarkPaid?() }
                    .tint(.green)
            }
        }
    }

    private var invoiceStatusColor: Color {
        switch entry.invoiceStatus {
        case .draft: return .gray
        case .sent: return .blue
        case .paid: return .green
        case .cancelled: return .red
        }
    }

    private var paymentStatusColor: Color {
        switch entry.paymentStatus {
        case .unpaid: return .red
        case .partial: return .orange
        case .paid: return .green
        }
    }
}
