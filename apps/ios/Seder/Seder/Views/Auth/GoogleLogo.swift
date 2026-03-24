import SwiftUI

/// Google "G" logo — uses a styled text glyph.
/// Replace with an actual Google logo asset (GoogleLogo.imageset) for production.
struct GoogleLogo: View {
    var body: some View {
        Text("G")
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        Color(red: 0.26, green: 0.52, blue: 0.96), // Google blue
                        Color(red: 0.86, green: 0.27, blue: 0.22), // Google red
                        Color(red: 0.96, green: 0.71, blue: 0.15), // Google yellow
                        Color(red: 0.20, green: 0.66, blue: 0.33), // Google green
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
    }
}
