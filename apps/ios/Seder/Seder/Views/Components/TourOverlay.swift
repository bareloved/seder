import SwiftUI

struct TourStep {
    let title: String
    let description: String
    let icon: String
}

struct TourOverlay: View {
    @Binding var isShowing: Bool
    @State private var currentStep = 0

    private let steps: [TourStep] = [
        TourStep(title: "ברוכים הבאים לסדר!", description: "בואו נכיר את הכלים שיעזרו לכם לעקוב אחרי ההכנסות.", icon: "hand.wave"),
        TourStep(title: "הוספת עבודה", description: "כאן תוכלו להוסיף עבודות חדשות ולעקוב אחרי חשבוניות ותשלומים.", icon: "plus.circle.fill"),
        TourStep(title: "ייבוא מיומן Google", description: "אפשר לייבא אירועים מהיומן ולהפוך אותם להכנסות באופן אוטומטי.", icon: "calendar"),
        TourStep(title: "דוחות וניתוחים", description: "כאן תוכלו לראות סיכומים, גרפים ומעקב אחרי הביצועים שלכם.", icon: "chart.bar.fill"),
        TourStep(title: "ניהול לקוחות", description: "כאן תוכלו לנהל את הלקוחות שלכם ולראות נתונים על כל לקוח.", icon: "person.2.fill"),
        TourStep(title: "יאללה תהנו!", description: "זהו, אתם מוכנים. בהצלחה עם ההכנסות!", icon: "sparkles"),
    ]

    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    UserDefaults.standard.set(true, forKey: "hasSeenTour")
                    withAnimation(.easeInOut(duration: 0.2)) { isShowing = false }
                }

            VStack(spacing: 0) {
                // Icon
                ZStack {
                    Circle()
                        .fill(SederTheme.brandGreen.opacity(0.15))
                        .frame(width: 72, height: 72)
                    Image(systemName: steps[currentStep].icon)
                        .font(.system(size: 30))
                        .foregroundStyle(SederTheme.brandGreen)
                }
                .padding(.top, 28)
                .padding(.bottom, 16)

                // Title
                Text(steps[currentStep].title)
                    .font(SederTheme.ploni(20, weight: .semibold))
                    .foregroundStyle(SederTheme.textPrimary)
                    .padding(.bottom, 8)

                // Description
                Text(steps[currentStep].description)
                    .font(SederTheme.ploni(15))
                    .foregroundStyle(SederTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)

                Divider()
                    .padding(.horizontal, 16)

                // Footer
                HStack {
                    // Step counter
                    Text("\(currentStep + 1) מתוך \(steps.count)")
                        .font(SederTheme.ploni(13))
                        .foregroundStyle(SederTheme.textTertiary)

                    Spacer()

                    // Navigation buttons
                    HStack(spacing: 12) {
                        if currentStep > 0 {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) { currentStep -= 1 }
                            } label: {
                                Text("הקודם")
                                    .font(SederTheme.ploni(15, weight: .medium))
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                        }

                        Button {
                            advance()
                        } label: {
                            Text(currentStep < steps.count - 1 ? "הבא" : "סיום")
                                .font(SederTheme.ploni(15, weight: .semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 8)
                                .background(SederTheme.brandGreen)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
            .background(SederTheme.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.15), radius: 20, y: 8)
            .padding(.horizontal, 28)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .transition(.opacity)
    }

    private func advance() {
        if currentStep < steps.count - 1 {
            withAnimation(.easeInOut(duration: 0.2)) { currentStep += 1 }
        } else {
            UserDefaults.standard.set(true, forKey: "hasSeenTour")
            withAnimation(.easeInOut(duration: 0.2)) { isShowing = false }
        }
    }
}
