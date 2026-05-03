import SwiftUI

/// Non-dismissable full-screen gate shown to authenticated users whose
/// termsAcceptedAt is null or whose accepted terms version is older than
/// TERMS_VERSION. Required by Israeli law: explicit, separate consent for
/// terms vs marketing, with timestamp + IP captured server-side.
struct ConsentSheet: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var termsAccepted = false
    @State private var marketingOptIn = false
    @State private var submitting = false
    @State private var error: String?

    private let bgTop = Color(red: 0.106, green: 0.263, blue: 0.196)
    private let bgBottom = Color(red: 0.059, green: 0.169, blue: 0.122)
    private let accentGreen = Color(red: 0.18, green: 0.80, blue: 0.44)

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [bgTop, bgBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    Spacer().frame(height: 60)

                    Text("רק רגע לפני שנמשיך")
                        .font(SederTheme.ploni(24, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text("ההסכמה לדיוור היא בחירה נפרדת.")
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(Color.white.opacity(0.6))
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let error {
                        Text(error)
                            .font(SederTheme.ploni(14))
                            .foregroundStyle(.white)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.red.opacity(0.6))
                            )
                    }

                    consentRow(
                        isOn: $termsAccepted,
                        required: true,
                        text: "אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות",
                        linkURL: "/terms"
                    )

                    consentRow(
                        isOn: $marketingOptIn,
                        required: false,
                        text: "אני מסכים/ה לקבל עדכונים שיווקיים ודיוור במייל. ניתן להסיר בכל עת.",
                        linkURL: nil
                    )

                    Spacer().frame(height: 8)

                    Button {
                        guard termsAccepted, !submitting else { return }
                        Task { await submit() }
                    } label: {
                        Group {
                            if submitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("המשך")
                                    .font(SederTheme.ploni(16, weight: .bold))
                                    .foregroundStyle(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(termsAccepted && !submitting ? accentGreen : accentGreen.opacity(0.4))
                        )
                    }
                    .disabled(!termsAccepted || submitting)


                    Spacer()
                }
                .padding(.horizontal, 28)
            }
        }
        .interactiveDismissDisabled(true)
    }

    @ViewBuilder
    private func consentRow(
        isOn: Binding<Bool>,
        required: Bool,
        text: String,
        linkURL: String?
    ) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: isOn.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.system(size: 22))
                    .foregroundStyle(isOn.wrappedValue ? accentGreen : Color.white.opacity(0.5))
                VStack(alignment: .leading, spacing: 4) {
                    Text(text + (required ? " *" : ""))
                        .font(SederTheme.ploni(14))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if let linkURL, let url = URL(string: "https://sedder.app" + linkURL) {
                        Link("פתיחת המסמכים בדפדפן", destination: url)
                            .font(SederTheme.ploni(12))
                            .foregroundStyle(accentGreen)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
    }

    private func submit() async {
        submitting = true
        defer { submitting = false }
        let ok = await auth.submitConsent(
            marketingOptIn: marketingOptIn,
            source: "consent_banner"
        )
        if !ok {
            error = "השמירה נכשלה. נסו שוב."
        }
    }
}
