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
    @State private var showFeedback = false
    @State private var showIconPicker = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // MARK: - Profile card
                    if let user = auth.user {
                        profileCard(user: user)
                    }

                    accountSection
                    preferencesSection
                    notificationsSection
                    calendarSection
                    managementSection
                    dataSection
                    dangerSection
                    signOutButton
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
            .sheet(isPresented: $showFeedback) {
                FeedbackSheet()
            }
            .sheet(isPresented: $showIconPicker) {
                AppIconPickerView()
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
            .onChange(of: viewModel.currency) { Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.timezone) { Task { await viewModel.savePreferences() } }
            .onChange(of: viewModel.language) { Task { await viewModel.savePreferences() } }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Sections

    private var accountSection: some View {
        SettingsSection(title: "חשבון") {
            SettingsRow(icon: "lock.rotation", label: "שינוי סיסמה") {
                showChangePassword = true
            }
            Divider().padding(.horizontal, 16)
            SettingsRow(icon: "envelope", label: "שינוי אימייל") {
                showChangeEmail = true
            }
        }
    }

    private var preferencesSection: some View {
        SettingsSection(title: "העדפות") {
            VStack(spacing: 0) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "paintbrush")
                            .font(.body)
                            .foregroundStyle(SederTheme.textSecondary)
                        Text("מראה")
                            .font(SederTheme.ploni(17))
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

                preferencePicker(
                    icon: "sheqelsign.circle",
                    label: "מטבע",
                    selection: $viewModel.currency,
                    options: [("ILS", "₪ שקל"), ("USD", "$ דולר"), ("EUR", "€ אירו")]
                )

                Divider().padding(.horizontal, 16)

                preferencePicker(
                    icon: "clock",
                    label: "אזור זמן",
                    selection: $viewModel.timezone,
                    options: [("Asia/Jerusalem", "ירושלים")]
                )

                Divider().padding(.horizontal, 16)

                languageRow

                Divider().padding(.horizontal, 16)

                SettingsRow(icon: "app.badge", label: "סמל אפליקציה") {
                    showIconPicker = true
                }

                Divider().padding(.horizontal, 16)

                Button {
                    UserDefaults.standard.set(false, forKey: "hasSeenTour")
                    dismiss()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "questionmark.circle")
                            .font(.body)
                            .foregroundStyle(SederTheme.textSecondary)
                        Text("הצג סיור מודרך שוב")
                            .font(SederTheme.ploni(17))
                            .foregroundStyle(SederTheme.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.left")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
        }
    }

    private var notificationsSection: some View {
        NotificationsSettingsSection(viewModel: viewModel)
    }

    private var calendarSection: some View {
        SettingsSection(title: "יומן") {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.body)
                        .foregroundStyle(SederTheme.textSecondary)
                    Circle()
                        .fill(viewModel.calendarConnected ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(viewModel.calendarConnected ? "מחובר" : "לא מחובר")
                        .font(SederTheme.ploni(17))
                        .foregroundStyle(SederTheme.textPrimary)
                }

                Spacer()

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
    }

    private var dataSection: some View {
        SettingsSection(title: "נתונים") {
            SettingsRow(icon: "square.and.arrow.up", label: "ייצוא CSV") {
                showExport = true
            }
            Divider().padding(.horizontal, 16)
            SettingsRow(icon: "envelope", label: "שליחת משוב") {
                showFeedback = true
            }
        }
    }

    private var managementSection: some View {
        SettingsSection(title: "ניהול") {
            SettingsRow(icon: "tag", label: "קטגוריות") {
                showCategories = true
            }
        }
    }

    private var dangerSection: some View {
        SettingsSection(title: "אזור מסוכן") {
            Button {
                showDeleteConfirm = true
            } label: {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "trash")
                        Text("מחיקת חשבון")
                            .font(SederTheme.ploni(17))
                    }
                    .foregroundStyle(.red)

                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
        }
    }

    private var signOutButton: some View {
        Button(role: .destructive) {
            showSignOutConfirm = true
        } label: {
            HStack {
                Spacer()
                Label {
                    Text("התנתקות")
                        .font(SederTheme.ploni(17, weight: .medium))
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

    // MARK: - Profile Card

    private func profileCard(user: User) -> some View {
        VStack(spacing: 12) {
            if let imageURL = user.image, let url = URL(string: imageURL) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Text(String(user.displayName.prefix(1)))
                        .font(SederTheme.ploni(25, weight: .semibold))
                        .foregroundStyle(SederTheme.brandGreen)
                }
                .frame(width: 56, height: 56)
                .clipShape(Circle())
            } else {
                Text(String(user.displayName.prefix(1)))
                    .font(SederTheme.ploni(25, weight: .semibold))
                    .foregroundStyle(SederTheme.brandGreen)
                    .frame(width: 56, height: 56)
                    .background(SederTheme.brandGreen.opacity(0.1))
                    .clipShape(Circle())
            }

            Text(user.displayName)
                .font(SederTheme.ploni(19, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)
            Text(user.email)
                .font(SederTheme.ploni(15))
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

    // MARK: - Preference Picker

    private func preferencePicker(icon: String, label: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        HStack {
            // First = RIGHT in RTL: icon + label
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                Text(label)
                    .font(SederTheme.ploni(17))
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
                        .font(SederTheme.ploni(17))
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
                    .font(SederTheme.ploni(17))
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
                            .font(SederTheme.ploni(17))
                            .foregroundStyle(SederTheme.textSecondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10))
                            .foregroundStyle(SederTheme.textTertiary)
                    }
                }

                if viewModel.language == "en" {
                    Text("בקרוב")
                        .font(SederTheme.ploni(13, weight: .medium))
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
                .font(SederTheme.ploni(13, weight: .medium))
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

// MARK: - Notifications Settings (extracted to reduce body complexity)

struct NotificationsSettingsSection: View {
    @ObservedObject var viewModel: SettingsViewModel

    var body: some View {
        SettingsSection(title: "תזכורות") {
            VStack(spacing: 0) {
                thresholdRows
                Divider().padding(.horizontal, 16)
                pushToggleRows
            }
        }
    }

    private var thresholdRows: some View {
        VStack(spacing: 0) {
            thresholdRow(
                icon: "doc.text",
                label: "ימים עד תזכורת חשבונית",
                value: $viewModel.nudgeInvoiceDays,
                range: 1...30
            )
            Divider().padding(.horizontal, 16)
            thresholdRow(
                icon: "creditcard",
                label: "ימים עד תזכורת תשלום",
                value: $viewModel.nudgePaymentDays,
                range: 1...60
            )
        }
    }

    private func thresholdRow(icon: String, label: String, value: Binding<Int>, range: ClosedRange<Int>) -> some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                Text(label)
                    .font(SederTheme.ploni(17))
                    .foregroundStyle(SederTheme.textPrimary)
            }
            Spacer()
            Stepper("\(value.wrappedValue)", value: value, in: range)
                .labelsHidden()
            Text("\(value.wrappedValue)")
                .font(SederTheme.ploni(17))
                .foregroundStyle(SederTheme.textSecondary)
                .frame(width: 24)
                .environment(\.layoutDirection, .leftToRight)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .onChange(of: value.wrappedValue) {
            Task { await viewModel.saveNudgeSettings() }
        }
    }

    private var pushToggleRows: some View {
        VStack(spacing: 0) {
            pushToggle(label: "עבודות ללא חשבונית", icon: "doc.text", isOn: $viewModel.nudgePushPrefs.uninvoiced)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תזכורת שבועית לחשבוניות", icon: "doc.on.doc", isOn: $viewModel.nudgePushPrefs.batch_invoice)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תשלומים באיחור", icon: "exclamationmark.circle", isOn: $viewModel.nudgePushPrefs.overdue_payment)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תשלומים באיחור חמור", icon: "exclamationmark.triangle", isOn: $viewModel.nudgePushPrefs.way_overdue)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תשלום חלקי תקוע", icon: "creditcard", isOn: $viewModel.nudgePushPrefs.partial_stale)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תזכורת סוף חודש", icon: "clock", isOn: $viewModel.nudgePushPrefs.month_end)
        }
    }

    private func pushToggle(label: String, icon: String, isOn: Binding<Bool>) -> some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(SederTheme.textSecondary)
                Text(label)
                    .font(SederTheme.ploni(17))
                    .foregroundStyle(SederTheme.textPrimary)
            }
            Spacer()
            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(SederTheme.brandGreen)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .onChange(of: isOn.wrappedValue) {
            Task { await viewModel.saveNudgeSettings() }
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
                        .font(SederTheme.ploni(16))
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
