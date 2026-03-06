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
        HStack {
            Button {
                selectedDate = calendar.date(byAdding: .month, value: 1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.left")
            }

            Text(monthString)
                .font(.headline)
                .frame(minWidth: 140)

            Button {
                selectedDate = calendar.date(byAdding: .month, value: -1, to: selectedDate)!
            } label: {
                Image(systemName: "chevron.right")
            }
        }
    }
}
