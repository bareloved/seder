import SwiftUI

struct MainTabView: View {
    @AppStorage("darkMode") private var darkMode = false

    var body: some View {
        TabView {
            IncomeListView()
                .tabItem {
                    Label("הכנסות", systemImage: "banknote.fill")
                }

            ClientsView()
                .tabItem {
                    Label("לקוחות", systemImage: "person.2.fill")
                }

            AnalyticsView()
                .tabItem {
                    Label("דוחות", systemImage: "chart.bar.fill")
                }

            Text("הוצאות - בקרוב")
                .tabItem {
                    Label("הוצאות", systemImage: "dollarsign.circle")
                }
        }
        .tint(SederTheme.brandGreen)
        .preferredColorScheme(darkMode ? .dark : nil)
    }
}
