import SwiftUI

struct CadencePickerView: View {
    @Binding var cadence: Cadence

    private let weekdays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]

    private var currentKind: String {
        switch cadence {
        case .daily: return "daily"
        case .weekly: return "weekly"
        case .monthly: return "monthly"
        }
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 12) {
            Picker("תדירות", selection: Binding(
                get: { currentKind },
                set: { newKind in
                    switch newKind {
                    case "daily":
                        cadence = .daily(interval: 1)
                    case "weekly":
                        let day = Calendar.current.component(.weekday, from: Date()) - 1
                        cadence = .weekly(interval: 1, weekdays: [day])
                    case "monthly":
                        cadence = .monthly(interval: 1, dayOfMonth: Calendar.current.component(.day, from: Date()))
                    default:
                        break
                    }
                }
            )) {
                Text("יומי").tag("daily")
                Text("שבועי").tag("weekly")
                Text("חודשי").tag("monthly")
            }
            .pickerStyle(.segmented)

            switch cadence {
            case .daily(let interval):
                HStack {
                    Text("כל")
                    Stepper(value: Binding(
                        get: { interval },
                        set: { cadence = .daily(interval: max(1, $0)) }
                    ), in: 1...365) {
                        Text("\(interval)")
                    }
                    Text(interval == 1 ? "יום" : "ימים")
                }
            case .weekly(let interval, let selectedDays):
                VStack(alignment: .trailing, spacing: 8) {
                    HStack {
                        Text("כל")
                        Stepper(value: Binding(
                            get: { interval },
                            set: { cadence = .weekly(interval: max(1, $0), weekdays: selectedDays) }
                        ), in: 1...52) {
                            Text("\(interval)")
                        }
                        Text("שבועות ב-")
                    }
                    HStack(spacing: 8) {
                        ForEach(0..<7, id: \.self) { idx in
                            let isSelected = selectedDays.contains(idx)
                            Button {
                                var next = selectedDays
                                if isSelected {
                                    next.removeAll { $0 == idx }
                                    if next.isEmpty { return }
                                } else {
                                    next.append(idx)
                                    next.sort()
                                }
                                cadence = .weekly(interval: interval, weekdays: next)
                            } label: {
                                Text(weekdays[idx])
                                    .font(.system(size: 14, weight: .medium))
                                    .frame(width: 36, height: 36)
                                    .background(isSelected ? SederTheme.brandGreen : SederTheme.subtleBg)
                                    .foregroundColor(isSelected ? .white : SederTheme.textSecondary)
                                    .clipShape(Circle())
                                    .overlay(Circle().stroke(SederTheme.cardBorder, lineWidth: 1))
                            }
                        }
                    }
                }
            case .monthly(let interval, let dayOfMonth):
                HStack {
                    Text("כל")
                    Stepper(value: Binding(
                        get: { interval },
                        set: { cadence = .monthly(interval: max(1, $0), dayOfMonth: dayOfMonth) }
                    ), in: 1...12) { Text("\(interval)") }
                    Text("חודשים ביום")
                    Stepper(value: Binding(
                        get: { dayOfMonth },
                        set: { cadence = .monthly(interval: interval, dayOfMonth: max(1, min(31, $0))) }
                    ), in: 1...31) { Text("\(dayOfMonth)") }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
