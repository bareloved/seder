import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showChangePassword = false
    @State private var showChangeEmail = false
    @State private var showCategories = false
    @State private var showExport = false
    @State private var showDeleteConfirm = false
    @State private var showDeleteFinalConfirm = false
    @State private var deleteConfirmText = ""
    @State private var showSignOutConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // MARK: - Profile card
                    if let user = auth.user {
                        VStack(spacing: 12) {
                            Text(String(user.displayName.prefix(1)))
                                .font(SederTheme.ploni(24, weight: .semibold))
                                .foregroundStyle(SederTheme.brandGreen)
                                .frame(width: 56, height: 56)
                                .background(SederTheme.brandGreen.opacity(0.1))
                                .clipShape(Circle())

                            Text(user.displayName)
                                .font(SederTheme.ploni(18, weight: .semibold))
                                .foregroundStyle(SederTheme.textPrimary)
                            Text(user.email)
                                .font(SederTheme.ploni(14))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(SederTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(SederTheme.cardBorder, lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
                    }

                    // MARK: - Account
                    SettingsSection(title: "חשבון") {
                        SettingsRow(icon: "lock.rotation", label: "שינוי סיסמה") {
                            showChangePassword = true
                        }
                        Divider().padding(.horizontal, 16)
                        SettingsRow(icon: "envelope", label: "שינוי אימייל") {
                            showChangeEmail = true
                        }
                    }

                    // MARK: - Preferences
                    SettingsSection(title: "העדפות") {
                        VStack(spacing: 0) {
                            // Appearance — first = RIGHT in RTL
                            HStack {
                                HStack(spacing: 8) {
                                    Image(systemName: "paintbrush")
                                        .font(.body)
                                        .foregroundStyle(SederTheme.textSecondary)
                                    Text("מראה")
                                        .font(SederTheme.ploni(16))
                                        .foregroundStyle(SederTheme.textPrimary)
                                }
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 8)

                            Picker("", selection: $appearanceMode) {
                                Text("כהה").tag("dark")
                                Text("בהיר").tag("light")
                                Text("מערכת").tag("system")
                            }
                            .pickerStyle(.segmented)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 12)

                            Divider().padding(.horizontal, 16)

                            // Currency
                            preferencePicker(
                                icon: "sheqelsign.circle",
                                label: "מטבע",
                                selection: $viewModel.currency,
                                options: [("ILS", "₪ שקל"), ("USD", "$ דולר"), ("EUR", "€ אירו")]
                            )

                            Divider().padding(.horizontal, 16)

                            // Timezone
                            preferencePicker(
                                icon: "clock",
                                label: "אזור זמן",
                                selection: $viewModel.timezone,
                                options: [("Asia/Jerusalem", "ירושלים")]
                            )

                            Divider().padding(.horizontal, 16)

                            // Language
                            languageRow
                        }
                    }

                    // MARK: - Calendar
                    SettingsSection(title: "יומן") {
                        HStack {
                            // First = RIGHT in RTL: icon, dot, text
                            HStack(spacing: 8) {
                                Image(systemName: "calendar")
                                    .font(.body)
                                    .foregroundStyle(SederTheme.textSecondary)
                                Circle()
                                    .fill(viewModel.calendarConnected ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)
                                Text(viewModel.calendarConnected ? "מחובר" : "לא מחובר")
                                    .font(SederTheme.ploni(16))
                                    .foregroundStyle(SederTheme.textPrimary)
                            }

                            Spacer()

                            // Last = LEFT in RTL: action button
                            Button {
                                if let url = URL(string: "https://sedder.app/settings") {
                                    UIApplication.shared.open(url)
                                }
                            } label: {
                                Text(viewModel.calendarConnected ? "ניהול חיבור" : "חבר דרך האתר")
                                    .font(SederTheme.ploni(14, weight: .medium))
                                    .foregroundStyle(SederTheme.brandGreen)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }

                    // MARK: - Data
                    SettingsSection(title: "נתונים") {
                        SettingsRow(icon: "square.and.arrow.up", label: "ייצוא CSV") {
                            showExport = true
                        }
                    }

                    // MARK: - Management
                    SettingsSection(title: "ניהול") {
                        SettingsRow(icon: "tag", label: "קטגוריות") {
                            showCategories = true
                        }
                    }

                    // MARK: - Danger zone
                    SettingsSection(title: "אזור מסוכן") {
                        Button {
                            showDeleteConfirm = true
                        } label: {
                            HStack {
                                // First = RIGHT in RTL: icon + label
                                HStack(spacing: 8) {
                                    Image(systemName: "trash")
                                    Text("מחיקת חשבון")
                                        .font(SederTheme.ploni(16))
                                }
                                .foregroundStyle(.red)

                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                        }
                    }

                    // MARK: - Sign out
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Spacer()
                            Label {
                                Text("התנתקות")
                                    .font(SederTheme.ploni(16, weight: .medium))
                            } icon: {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                            }
                            Spacer()
                        }
                        .padding(.vertical, 14)
                        .background(SederTheme.cardBg)
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
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SederTheme.textSecondary)
                    }
                }
            }
            .sheet(isPresented: $showChangePassword) {
                ChangePasswordView()
            }
            .sheet(isPresented: $showChangeEmail) {
                ChangeEmailView(currentEmail: auth.user?.email ?? "")
            }
            .sheet(isPresented: $showCategories) {
                CategoriesView()
            }
            .sheet(isPresented: $showExport) {
                ExportDataSheet(viewModel: viewModel)
            }
            .confirmationDialog("האם להתנתק?", isPresented: $showSignOutConfirm) {
                Button("התנתקות", role: .destructive) {
                    auth.signOut()
                    dismiss()
                }
                Button("ביטול", role: .cancel) {}
            }
            .alert("מחיקת חשבון", isPresented: $showDeleteConfirm) {
                Button("ביטול", role: .cancel) {}
                Button("המשך", role: .destructive) {
                    showDeleteFinalConfirm = true
                }
            } message: {
                Text("פעולה זו תמחק את כל הנתונים שלך לצמיתות. האם להמשיך?")
            }
            .alert("הקלד DELETE לאישור", isPresented: $showDeleteFinalConfirm) {
                TextField("DELETE", text: $deleteConfirmText)
                    .environment(\.layoutDirection, .leftToRight)
                Button("ביטול", role: .cancel) {
                    deleteConfirmText = ""
                }
                Button("מחק לצמיתות", role: .destructive) {
                    guard deleteConfirmText == "DELETE" else { return }
                    Task {
                        if await viewModel.deleteAccount() {
                            auth.signOut()
                            dismiss()
                        }
                    }
                }
            }
            .preferredColorScheme(appearanceMode == "dark" ? .dark : appearanceMode == "light" ? .light : nil)
            .task {
                await viewModel.loadSettings()
                await viewModel.checkCalendarStatus()
            }
            .onChange(of: viewModel.currency) { _ in Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.timezone) { _ in Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.language) { _ in Task { await viewModel.savePreferences() } }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Preference Picker

    private func preferencePicker(icon: String, label: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        HStack {
            // First = RIGHT in RTL: icon + label
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                Text(label)
                    .font(SederTheme.ploni(16))
                    .foregroundStyle(SederTheme.textPrimary)
            }

            Spacer()

            // Last = LEFT in RTL: menu value
            Menu {
                ForEach(options, id: \.0) { value, display in
                    Button {
                        selection.wrappedValue = value
                    } label: {
                        if value == selection.wrappedValue {
                            Label(display, systemImage: "checkmark")
                        } else {
                            Text(display)
                        }
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(options.first(where: { $0.0 == selection.wrappedValue })?.1 ?? "")
                        .font(SederTheme.ploni(16))
                        .foregroundStyle(SederTheme.textSecondary)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 10))
                        .foregroundStyle(SederTheme.textTertiary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Language Row

    private var languageRow: some View {
        HStack {
            // First = RIGHT in RTL: icon + label
            HStack(spacing: 8) {
                Image(systemName: "globe")
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                Text("שפה")
                    .font(SederTheme.ploni(16))
                    .foregroundStyle(SederTheme.textPrimary)
            }

            Spacer()

            // Last = LEFT in RTL: menu + badge
            HStack(spacing: 8) {
                Menu {
                    Button {
                        viewModel.language = "he"
                    } label: {
                        if viewModel.language == "he" {
                            Label("עברית", systemImage: "checkmark")
                        } else {
                            Text("עברית")
                        }
                    }
                    Button {
                        viewModel.language = "en"
                    } label: {
                        if viewModel.language == "en" {
                            Label("English", systemImage: "checkmark")
                        } else {
                            Text("English")
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(viewModel.language == "he" ? "עברית" : "English")
                            .font(SederTheme.ploni(16))
                            .foregroundStyle(SederTheme.textSecondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                }

                if viewModel.language == "en" {
                    Text("בקרוב")
                        .font(SederTheme.ploni(12, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(SederTheme.brandGreen)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(SederTheme.textSecondary)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content()
            }
            .background(SederTheme.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
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
                // First = RIGHT in RTL: icon + label
                HStack(spacing: 8) {
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(SederTheme.textSecondary)
                    Text(label)
                        .font(.subheadline)
                        .foregroundStyle(SederTheme.textPrimary)
                }
                Spacer()
                // Last = LEFT in RTL: chevron
                Image(systemName: "chevron.left")
                    .font(.caption)
                    .foregroundStyle(SederTheme.textTertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
    }
}
