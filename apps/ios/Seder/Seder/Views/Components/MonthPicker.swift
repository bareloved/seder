import SwiftUI

struct MonthPicker: View {
    @Binding var selectedDate: Date

    private let calendar = Calendar.current
    private let hebrewMonths = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ]

    private var monthString: String {
        let month = calendar.component(.month, from: selectedDate)
        let year = calendar.component(.year, from: selectedDate)
        return "\(hebrewMonths[month - 1]) \(year)"
    }

    var body: some View {
        HStack(spacing: 16) {
            // First = RIGHT in RTL: right chevron → previous month
            Button {
                selectedDate = calendar.date(byAdding: .month, value: -1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.right")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SederTheme.brandGreen)
                    .frame(width: 36, height: 36)
                    .background(SederTheme.brandGreen.opacity(0.1))
                    .clipShape(Circle())
                    .environment(\.layoutDirection, .leftToRight)
            }

            Text(monthString)
                .font(.system(.headline, design: .rounded))
                .frame(minWidth: 140)

            // Last = LEFT in RTL: left chevron → next month
            Button {
                selectedDate = calendar.date(byAdding: .month, value: 1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SederTheme.brandGreen)
                    .frame(width: 36, height: 36)
                    .background(SederTheme.brandGreen.opacity(0.1))
                    .clipShape(Circle())
                    .environment(\.layoutDirection, .leftToRight)
            }
        }
    }
}
