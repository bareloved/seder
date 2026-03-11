import SwiftUI

struct GreenNavBar<LeadingContent: View>: View {
    let title: String
    var onSettingsTap: () -> Void
    var avatarURL: String?
    @ViewBuilder var leadingContent: () -> LeadingContent

    init(
        title: String,
        onSettingsTap: @escaping () -> Void,
        avatarURL: String? = nil,
        @ViewBuilder leadingContent: @escaping () -> LeadingContent = { EmptyView() }
    ) {
        self.title = title
        self.onSettingsTap = onSettingsTap
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

                // Physical left (trailing in RTL): avatar/settings
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
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0)
        .background(SederTheme.headerBg.ignoresSafeArea(edges: .top))
    }
}
