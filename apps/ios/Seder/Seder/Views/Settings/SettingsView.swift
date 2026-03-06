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
            List {
                // Profile section
                Section {
                    if let user = auth.user {
                        HStack(spacing: 14) {
                            Circle()
                                .fill(SederTheme.brandGreen.opacity(0.12))
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Text(String(user.displayName.prefix(1)))
                                        .font(.title2.weight(.semibold))
                                        .foregroundStyle(SederTheme.brandGreen)
                                )

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(user.displayName)
                                    .font(.headline)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    Button {
                        showChangePassword = true
                    } label: {
                        Label("שינוי סיסמה", systemImage: "lock.rotation")
                    }
                    .foregroundStyle(.primary)
                } header: {
                    Text("פרופיל")
                }

                // Preferences
                Section("העדפות") {
                    Toggle(isOn: $darkMode) {
                        Label("מצב כהה", systemImage: "moon.fill")
                    }
                    .tint(SederTheme.brandGreen)
                }

                // Management
                Section("ניהול") {
                    Button {
                        showCategories = true
                    } label: {
                        Label("קטגוריות", systemImage: "tag")
                    }
                    .foregroundStyle(.primary)
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        Label("התנתקות", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
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
