import SwiftUI

struct GreenNavBar<LeadingContent: View>: View {
    let title: String
    var onSettingsTap: () -> Void
    var onFeedbackTap: (() -> Void)?
    var avatarURL: String?
    @ViewBuilder var leadingContent: () -> LeadingContent

    init(
        title: String,
        onSettingsTap: @escaping () -> Void,
        onFeedbackTap: (() -> Void)? = nil,
        avatarURL: String? = nil,
        @ViewBuilder leadingContent: @escaping () -> LeadingContent = { EmptyView() }
    ) {
        self.title = title
        self.onSettingsTap = onSettingsTap
        self.onFeedbackTap = onFeedbackTap
        self.avatarURL = avatarURL
        self.leadingContent = leadingContent
    }

    var body: some View {
        ZStack {
            // Center: title
            Text(title)
                .font(SederTheme.ploni(18, weight: .semibold))
                .foregroundStyle(.white)

            HStack {
                // Physical right (leading in RTL): custom content (e.g. add button)
                leadingContent()

                Spacer()

                // Physical left (trailing in RTL): feedback + avatar/settings
                HStack(spacing: 12) {
                if let onFeedbackTap {
                    Button(action: onFeedbackTap) {
                        Image(systemName: "bubble.left.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }

                Button(action: onSettingsTap) {
                    if let urlString = avatarURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(.white.opacity(0.9))
                        }
                        .frame(width: 34, height: 34)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0)
        .background(SederTheme.headerBg.ignoresSafeArea(edges: .top))
    }
}
