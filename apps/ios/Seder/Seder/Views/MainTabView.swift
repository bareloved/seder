import SwiftUI

struct MainTabView: View {
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @State private var clientsVM = ClientsViewModel()
    @EnvironmentObject private var appState: AppState

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

            Text("הוצאות - בקרוב")
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("הוצאות", systemImage: "dollarsign.circle")
                }
                .tag(3)
        }
        .tint(SederTheme.brandGreen)
        .preferredColorScheme(appearanceMode == "dark" ? .dark : appearanceMode == "light" ? .light : nil)
        .task {
            await clientsVM.loadClients()
        }
    }
}
