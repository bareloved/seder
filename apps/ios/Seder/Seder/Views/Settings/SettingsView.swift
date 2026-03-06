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
                Section("פרופיל") {
                    if let user = auth.user {
                        LabeledContent("שם", value: user.name)
                        LabeledContent("אימייל", value: user.email)
                    }
                    Button("שינוי סיסמה") {
                        showChangePassword = true
                    }
                }

                // Preferences
                Section("העדפות") {
                    Toggle("מצב כהה", isOn: $darkMode)
                }

                // Management
                Section("ניהול") {
                    Button("קטגוריות") {
                        showCategories = true
                    }
                }

                // Sign out
                Section {
                    Button("התנתקות", role: .destructive) {
                        showSignOutConfirm = true
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
