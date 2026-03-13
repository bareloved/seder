import SwiftUI

struct ErrorView: View {
    let message: String
    let retryAction: (() -> Void)?

    init(message: String = "משהו השתבש. נסו שוב.", retryAction: (() -> Void)? = nil) {
        self.message = message
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.orange)

            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            if let retryAction {
                Button("נסה שוב") {
                    retryAction()
                }
                .buttonStyle(.borderedProminent)
                .tint(SederTheme.brandGreen)
            }
        }
        .padding()
    }
}
