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
        VStack(alignment: .trailing, spacing: 14) {
            // Segmented kind picker
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
                HStack(spacing: 8) {
                    Text("כל")
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textSecondary)
                    numberStepper(
                        value: interval,
                        range: 1...365,
                        onChange: { cadence = .daily(interval: $0) },
                    )
                    Text(interval == 1 ? "יום" : "ימים")
                        .font(SederTheme.ploni(15))
                        .foregroundStyle(SederTheme.textSecondary)
                    Spacer()
                }

            case .weekly(let interval, let selectedDays):
                VStack(alignment: .trailing, spacing: 12) {
                    HStack(spacing: 8) {
                        Text("כל")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        numberStepper(
                            value: interval,
                            range: 1...52,
                            onChange: { cadence = .weekly(interval: $0, weekdays: selectedDays) },
                        )
                        Text(interval == 1 ? "שבוע ב-" : "שבועות ב-")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        Spacer()
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
                                    .frame(width: 32, height: 32)
                                    .background(isSelected ? SederTheme.brandGreen : SederTheme.cardBg)
                                    .foregroundStyle(isSelected ? .white : SederTheme.textSecondary)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle().stroke(
                                            isSelected ? SederTheme.brandGreen : SederTheme.cardBorder,
                                            lineWidth: 1,
                                        )
                                    )
                            }
                        }
                    }
                }

            case .monthly(let interval, let dayOfMonth):
                VStack(alignment: .trailing, spacing: 12) {
                    HStack(spacing: 8) {
                        Text("כל")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        numberStepper(
                            value: interval,
                            range: 1...12,
                            onChange: { cadence = .monthly(interval: $0, dayOfMonth: dayOfMonth) },
                        )
                        Text(interval == 1 ? "חודש" : "חודשים")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        Spacer()
                    }
                    HStack(spacing: 8) {
                        Text("ביום")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        numberStepper(
                            value: dayOfMonth,
                            range: 1...31,
                            onChange: { cadence = .monthly(interval: interval, dayOfMonth: $0) },
                        )
                        Text("בכל חודש")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textSecondary)
                        Spacer()
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Compact number stepper
    //
    // Renders: [value-box] [-] | [+]
    // Much tighter than SwiftUI's built-in Stepper, and keeps the value visually
    // adjacent to the controls so the connection is obvious.
    @ViewBuilder
    private func numberStepper(
        value: Int,
        range: ClosedRange<Int>,
        onChange: @escaping (Int) -> Void,
    ) -> some View {
        HStack(spacing: 6) {
            // Number pill — the thing that changes
            Text("\(value)")
                .font(.system(size: 16, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(SederTheme.textPrimary)
                .frame(minWidth: 32)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(SederTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )

            // +/- buttons in one segmented pill, tight together
            HStack(spacing: 0) {
                Button {
                    let next = min(range.upperBound, value + 1)
                    if next != value { onChange(next) }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(value < range.upperBound ? SederTheme.textPrimary : SederTheme.textTertiary)
                        .frame(width: 32, height: 28)
                }
                .disabled(value >= range.upperBound)

                Rectangle()
                    .fill(SederTheme.cardBorder)
                    .frame(width: 1, height: 16)

                Button {
                    let next = max(range.lowerBound, value - 1)
                    if next != value { onChange(next) }
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(value > range.lowerBound ? SederTheme.textPrimary : SederTheme.textTertiary)
                        .frame(width: 32, height: 28)
                }
                .disabled(value <= range.lowerBound)
            }
            .background(SederTheme.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )
        }
    }
}
