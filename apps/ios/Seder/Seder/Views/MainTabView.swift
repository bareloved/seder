import SwiftUI

struct MainTabView: View {
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @State private var clientsVM = ClientsViewModel()

    var body: some View {
        TabView {
            IncomeListView()
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("הכנסות", systemImage: "banknote.fill")
                }

            ClientsView(viewModel: clientsVM)
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("לקוחות", systemImage: "person.2.fill")
                }

            AnalyticsView()
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("דוחות", systemImage: "chart.bar.fill")
                }

            Text("הוצאות - בקרוב")
                .environment(\.layoutDirection, .rightToLeft)
                .tabItem {
                    Label("הוצאות", systemImage: "dollarsign.circle")
                }
        }
        .tint(SederTheme.brandGreen)
        .preferredColorScheme(appearanceMode == "dark" ? .dark : appearanceMode == "light" ? .light : nil)
        .task {
            await clientsVM.loadClients()
        }
    }
}
