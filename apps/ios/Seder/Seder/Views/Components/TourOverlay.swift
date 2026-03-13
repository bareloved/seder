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
        TourStep(title: "רשימת הכנסות", description: "כאן תראו את כל ההכנסות שלכם", icon: "list.bullet"),
        TourStep(title: "סיכומים ומסננים", description: "לחצו על הכרטיסיות כדי לסנן לפי סטטוס", icon: "chart.bar"),
        TourStep(title: "הוספת הכנסה", description: "לחצו על + כדי להוסיף הכנסה חדשה", icon: "plus.circle"),
        TourStep(title: "ייבוא מיומן", description: "ייבאו אירועים מיומן Google כהכנסות", icon: "calendar"),
        TourStep(title: "עוד לשוניות", description: "נווטו בין ניתוחים, קטגוריות והגדרות", icon: "square.grid.2x2"),
    ]

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture { advance() }

            VStack(spacing: 20) {
                Image(systemName: steps[currentStep].icon)
                    .font(.system(size: 36))
                    .foregroundColor(.white)

                Text(steps[currentStep].title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(steps[currentStep].description)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)

                HStack {
                    Text("\(currentStep + 1) מתוך \(steps.count)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()

                    if currentStep > 0 {
                        Button("הקודם") {
                            withAnimation { currentStep -= 1 }
                        }
                        .foregroundColor(.white)
                    }

                    Button(currentStep < steps.count - 1 ? "הבא" : "סיום") {
                        advance()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(SederTheme.brandGreen)
                }
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 32)
        }
        .transition(.opacity)
    }

    private func advance() {
        if currentStep < steps.count - 1 {
            withAnimation { currentStep += 1 }
        } else {
            withAnimation { isShowing = false }
        }
    }
}
