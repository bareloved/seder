import SwiftUI

/// Google "G" logo drawn with SwiftUI Shape paths matching the official Google icon.
struct GoogleLogo: View {
    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 24.0

            // Blue
            var blue = Path()
            blue.move(to: CGPoint(x: 22.56 * scale, y: 12.25 * scale))
            blue.addCurve(
                to: CGPoint(x: 22.56 * scale, y: 10.0 * scale),
                control1: CGPoint(x: 22.56 * scale, y: 11.47 * scale),
                control2: CGPoint(x: 22.49 * scale, y: 10.72 * scale)
            )
            blue.addLine(to: CGPoint(x: 12.0 * scale, y: 10.0 * scale))
            blue.addLine(to: CGPoint(x: 12.0 * scale, y: 14.26 * scale))
            blue.addLine(to: CGPoint(x: 17.92 * scale, y: 14.26 * scale))
            blue.addCurve(
                to: CGPoint(x: 15.71 * scale, y: 17.57 * scale),
                control1: CGPoint(x: 17.66 * scale, y: 15.63 * scale),
                control2: CGPoint(x: 16.88 * scale, y: 16.79 * scale)
            )
            blue.addLine(to: CGPoint(x: 19.28 * scale, y: 20.34 * scale))
            blue.addCurve(
                to: CGPoint(x: 22.56 * scale, y: 12.25 * scale),
                control1: CGPoint(x: 21.36 * scale, y: 18.42 * scale),
                control2: CGPoint(x: 22.56 * scale, y: 15.6 * scale)
            )
            blue.closeSubpath()
            context.fill(blue, with: .color(Color(red: 0.263, green: 0.522, blue: 0.957)))

            // Green
            var green = Path()
            green.move(to: CGPoint(x: 12.0 * scale, y: 23.0 * scale))
            green.addCurve(
                to: CGPoint(x: 19.28 * scale, y: 20.34 * scale),
                control1: CGPoint(x: 14.97 * scale, y: 23.0 * scale),
                control2: CGPoint(x: 17.46 * scale, y: 22.02 * scale)
            )
            green.addLine(to: CGPoint(x: 15.71 * scale, y: 17.57 * scale))
            green.addCurve(
                to: CGPoint(x: 12.0 * scale, y: 18.63 * scale),
                control1: CGPoint(x: 14.73 * scale, y: 18.23 * scale),
                control2: CGPoint(x: 13.48 * scale, y: 18.63 * scale)
            )
            green.addCurve(
                to: CGPoint(x: 5.84 * scale, y: 14.09 * scale),
                control1: CGPoint(x: 9.14 * scale, y: 18.63 * scale),
                control2: CGPoint(x: 6.71 * scale, y: 16.7 * scale)
            )
            green.addLine(to: CGPoint(x: 2.18 * scale, y: 16.93 * scale))
            green.addCurve(
                to: CGPoint(x: 12.0 * scale, y: 23.0 * scale),
                control1: CGPoint(x: 3.99 * scale, y: 20.53 * scale),
                control2: CGPoint(x: 7.7 * scale, y: 23.0 * scale)
            )
            green.closeSubpath()
            context.fill(green, with: .color(Color(red: 0.204, green: 0.659, blue: 0.325)))

            // Yellow
            var yellow = Path()
            yellow.move(to: CGPoint(x: 5.84 * scale, y: 14.09 * scale))
            yellow.addCurve(
                to: CGPoint(x: 5.84 * scale, y: 9.91 * scale),
                control1: CGPoint(x: 5.62 * scale, y: 13.43 * scale),
                control2: CGPoint(x: 5.49 * scale, y: 10.57 * scale)
            )
            yellow.addLine(to: CGPoint(x: 2.18 * scale, y: 7.07 * scale))
            yellow.addCurve(
                to: CGPoint(x: 2.18 * scale, y: 16.93 * scale),
                control1: CGPoint(x: 1.43 * scale, y: 8.55 * scale),
                control2: CGPoint(x: 1.0 * scale, y: 12.0 * scale)
            )
            yellow.addLine(to: CGPoint(x: 5.84 * scale, y: 14.09 * scale))
            yellow.closeSubpath()
            context.fill(yellow, with: .color(Color(red: 0.984, green: 0.737, blue: 0.020)))

            // Red
            var red = Path()
            red.move(to: CGPoint(x: 12.0 * scale, y: 5.38 * scale))
            red.addCurve(
                to: CGPoint(x: 16.21 * scale, y: 7.02 * scale),
                control1: CGPoint(x: 13.62 * scale, y: 5.38 * scale),
                control2: CGPoint(x: 15.06 * scale, y: 5.94 * scale)
            )
            red.addLine(to: CGPoint(x: 19.36 * scale, y: 3.87 * scale))
            red.addCurve(
                to: CGPoint(x: 12.0 * scale, y: 1.0 * scale),
                control1: CGPoint(x: 17.45 * scale, y: 2.09 * scale),
                control2: CGPoint(x: 14.97 * scale, y: 1.0 * scale)
            )
            red.addCurve(
                to: CGPoint(x: 2.18 * scale, y: 7.07 * scale),
                control1: CGPoint(x: 7.7 * scale, y: 1.0 * scale),
                control2: CGPoint(x: 3.99 * scale, y: 3.47 * scale)
            )
            red.addLine(to: CGPoint(x: 5.84 * scale, y: 9.91 * scale))
            red.addCurve(
                to: CGPoint(x: 12.0 * scale, y: 5.38 * scale),
                control1: CGPoint(x: 6.71 * scale, y: 7.31 * scale),
                control2: CGPoint(x: 9.3 * scale, y: 5.38 * scale)
            )
            red.closeSubpath()
            context.fill(red, with: .color(Color(red: 0.918, green: 0.263, blue: 0.208)))
        }
    }
}
