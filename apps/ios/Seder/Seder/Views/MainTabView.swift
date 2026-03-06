import SwiftUI

struct MainTabView: View {
    @AppStorage("darkMode") private var darkMode = false

    var body: some View {
        TabView {
            IncomeListView()
                .tabItem {
                    Label("הכנסות", systemImage: "banknote")
                }

            AnalyticsView()
                .tabItem {
                    Label("אנליטיקס", systemImage: "chart.bar")
                }

            ClientsView()
                .tabItem {
                    Label("לקוחות", systemImage: "person.2")
                }

            Text("הוצאות - בקרוב")
                .tabItem {
                    Label("הוצאות", systemImage: "creditcard")
                }
        }
        .tint(SederTheme.brandGreen)
        .preferredColorScheme(darkMode ? .dark : nil)
    }
}
