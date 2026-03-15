import SwiftUI

struct AppIconOption: Identifiable {
    let id: String // nil-safe key for setAlternateIconName
    let displayName: String
    let iconName: String? // nil = default (primary) icon
    let previewAsset: String // asset catalog image name for preview
}

struct AppIconPickerView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentIcon: String?

    private let icons: [AppIconOption] = [
        // Green variants
        AppIconOption(id: "default", displayName: "יער", iconName: nil, previewAsset: "AppIcon"),
        AppIconOption(id: "jade", displayName: "ירקן", iconName: "AppIcon-jade", previewAsset: "AppIcon-jade"),
        AppIconOption(id: "mint", displayName: "מנטה", iconName: "AppIcon-mint", previewAsset: "AppIcon-mint"),
        AppIconOption(id: "lime", displayName: "ליים", iconName: "AppIcon-lime", previewAsset: "AppIcon-lime"),
        AppIconOption(id: "spring", displayName: "אביב", iconName: "AppIcon-spring", previewAsset: "AppIcon-spring"),
        AppIconOption(id: "pistachio", displayName: "פיסטוק", iconName: "AppIcon-pistachio", previewAsset: "AppIcon-pistachio"),
        // Other colors
        AppIconOption(id: "ocean", displayName: "אוקיינוס", iconName: "AppIcon-ocean", previewAsset: "AppIcon-ocean"),
        AppIconOption(id: "midnight", displayName: "חצות", iconName: "AppIcon-midnight", previewAsset: "AppIcon-midnight"),
        AppIconOption(id: "abyss", displayName: "תהום", iconName: "AppIcon-abyss", previewAsset: "AppIcon-abyss"),
        AppIconOption(id: "sunset", displayName: "שקיעה", iconName: "AppIcon-sunset", previewAsset: "AppIcon-sunset"),
        AppIconOption(id: "ember", displayName: "גחלת", iconName: "AppIcon-ember", previewAsset: "AppIcon-ember"),
        AppIconOption(id: "obsidian", displayName: "אובסידיאן", iconName: "AppIcon-obsidian", previewAsset: "AppIcon-obsidian"),
    ]

    private let columns = [
        GridItem(.adaptive(minimum: 72, maximum: 80), spacing: 16)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(icons) { icon in
                        iconCell(icon)
                    }
                }
                .padding(16)
            }
            .background(SederTheme.pageBg)
            .navigationTitle("סמל אפליקציה")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .onAppear {
            currentIcon = UIApplication.shared.alternateIconName
        }
    }

    private func iconCell(_ icon: AppIconOption) -> some View {
        let isSelected = (icon.iconName == nil && currentIcon == nil) ||
                         (icon.iconName == currentIcon)

        return Button {
            setIcon(icon.iconName)
        } label: {
            VStack(spacing: 6) {
                Image("\(icon.previewAsset)-preview")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(isSelected ? SederTheme.brandGreen : Color.clear, lineWidth: 2.5)
                    )

                Text(icon.displayName)
                    .font(SederTheme.ploni(12))
                    .foregroundStyle(isSelected ? SederTheme.brandGreen : SederTheme.textSecondary)
                    .lineLimit(1)
            }
        }
    }

    private func setIcon(_ name: String?) {
        guard UIApplication.shared.supportsAlternateIcons else { return }
        UIApplication.shared.setAlternateIconName(name) { error in
            if error == nil {
                currentIcon = name
            }
        }
    }
}
