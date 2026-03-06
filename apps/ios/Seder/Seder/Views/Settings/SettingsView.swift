import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @AppStorage("darkMode") private var darkMode = false
    @State private var showChangePassword = false
    @State private var showCategories = false
    @State private var showSignOutConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Profile card
                    if let user = auth.user {
                        VStack(spacing: 12) {
                            // Avatar
                            Text(String(user.displayName.prefix(1)))
                                .font(.title.weight(.semibold))
                                .foregroundStyle(SederTheme.brandGreen)
                                .frame(width: 56, height: 56)
                                .background(SederTheme.brandGreen.opacity(0.1))
                                .clipShape(Circle())

                            Text(user.displayName)
                                .font(.headline)
                                .foregroundStyle(SederTheme.slate800)
                            Text(user.email)
                                .font(.caption)
                                .foregroundStyle(SederTheme.slate500)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(SederTheme.slate200.opacity(0.6), lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                    }

                    // Account section
                    SettingsSection(title: "חשבון") {
                        SettingsRow(icon: "lock.rotation", label: "שינוי סיסמה") {
                            showChangePassword = true
                        }
                    }

                    // Preferences section
                    SettingsSection(title: "העדפות") {
                        HStack {
                            Toggle("", isOn: $darkMode)
                                .labelsHidden()
                                .tint(SederTheme.brandGreen)
                            Spacer()
                            HStack(spacing: 8) {
                                Text("מצב כהה")
                                    .font(.subheadline)
                                    .foregroundStyle(SederTheme.slate800)
                                Image(systemName: "moon.fill")
                                    .font(.body)
                                    .foregroundStyle(SederTheme.slate500)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }

                    // Management section
                    SettingsSection(title: "ניהול") {
                        SettingsRow(icon: "tag", label: "קטגוריות") {
                            showCategories = true
                        }
                    }

                    // Sign out
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("התנתקות", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(.subheadline.weight(.medium))
                            Spacer()
                        }
                        .padding(.vertical, 14)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.2), lineWidth: 1)
                        )
                    }
                }
                .padding(12)
            }
            .background(SederTheme.pageBg)
            .navigationTitle("הגדרות")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגירה") { dismiss() }
                }
            }
            .sheet(isPresented: $showChangePassword) {
                ChangePasswordView()
            }
            .sheet(isPresented: $showCategories) {
                CategoriesView()
            }
            .confirmationDialog("האם להתנתק?", isPresented: $showSignOutConfirm) {
                Button("התנתקות", role: .destructive) {
                    auth.signOut()
                    dismiss()
                }
                Button("ביטול", role: .cancel) {}
            }
            .preferredColorScheme(darkMode ? .dark : nil)
        }
    }
}

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(SederTheme.slate500)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content()
            }
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(SederTheme.slate200.opacity(0.6), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let label: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: "chevron.left")
                    .font(.caption)
                    .foregroundStyle(SederTheme.slate400)
                Spacer()
                HStack(spacing: 8) {
                    Text(label)
                        .font(.subheadline)
                        .foregroundStyle(SederTheme.slate800)
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(SederTheme.slate500)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
    }
}
