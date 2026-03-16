import SwiftUI

struct MainTabView: View {
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @AppStorage("hasSeenTour") private var hasSeenTour = false
    @State private var clientsVM = ClientsViewModel()
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject var auth: AuthViewModel
    @State private var showSettings = false
    @State private var showTour = false

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            IncomeListView()
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("הכנסות", systemImage: "banknote.fill")
                }
                .tag(0)

            ClientsView(viewModel: clientsVM)
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("לקוחות", systemImage: "person.2.fill")
                }
                .tag(1)

            AnalyticsView()
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("דוחות", systemImage: "chart.bar.fill")
                }
                .tag(2)

            VStack(spacing: 0) {
                    GreenNavBar(
                        title: "הוצאות",
                        onSettingsTap: { showSettings = true },
                        avatarURL: auth.user?.image
                    )
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "dollarsign.circle")
                            .font(.system(size: 40))
                            .foregroundStyle(SederTheme.textTertiary)
                        Text("בקרוב")
                            .font(SederTheme.ploni(15))
                            .foregroundStyle(SederTheme.textTertiary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(SederTheme.subtleBg)
                            .clipShape(Capsule())
                    }
                    Spacer()
                }
                .background(SederTheme.pageBg)
                .ignoresSafeArea(edges: .top)
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("הוצאות", systemImage: "dollarsign.circle")
                }
                .tag(3)
        }
        .tint(SederTheme.brandGreen)
        .preferredColorScheme(appearanceMode == "dark" ? .dark : appearanceMode == "light" ? .light : nil)
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .task {
            await clientsVM.loadClients()
        }
        .onAppear {
            // Show tour for first-time users (only once)
            let seen = UserDefaults.standard.bool(forKey: "hasSeenTour")
            if !seen && !showTour {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    showTour = true
                }
            }
        }
        .overlay {
            if showTour {
                TourOverlay(isShowing: $showTour)
                    .onChange(of: showTour) {
                        if !showTour {
                            hasSeenTour = true
                            UserDefaults.standard.set(true, forKey: "hasSeenTour")
                        }
                    }
            }
        }
    }
}
