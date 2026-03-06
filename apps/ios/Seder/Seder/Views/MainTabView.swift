import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            Text("הכנסות")
                .tabItem {
                    Label("הכנסות", systemImage: "banknote")
                }
            Text("אנליטיקס")
                .tabItem {
                    Label("אנליטיקס", systemImage: "chart.bar")
                }
            Text("לקוחות")
                .tabItem {
                    Label("לקוחות", systemImage: "person.2")
                }
            Text("הוצאות")
                .tabItem {
                    Label("הוצאות", systemImage: "creditcard")
                }
        }
    }
}
