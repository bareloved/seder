import type { Metadata } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const ploni = localFont({
  src: [
    { path: "../public/fonts/ploni-ultralight-aaa.otf", weight: "200" },
    { path: "../public/fonts/ploni-light-aaa.otf", weight: "300" },
    { path: "../public/fonts/ploni-regular-aaa.otf", weight: "400" },
    { path: "../public/fonts/ploni-medium-aaa.otf", weight: "500" },
    { path: "../public/fonts/ploni-demibold-aaa.otf", weight: "600" },
    { path: "../public/fonts/ploni-bold-aaa.otf", weight: "700" },
    { path: "../public/fonts/ploni-ultrabold-aaa.otf", weight: "800" },
    { path: "../public/fonts/ploni-black-aaa.otf", weight: "900" },
  ],
  variable: "--font-ploni",
});

export const metadata: Metadata = {
  title: "Seder",
  description: "ניהול הכנסות לפרילנסרים ומוזיקאים",
  metadataBase: new URL("https://seder.app"),
  openGraph: {
    title: "Seder",
    description: "ניהול הכנסות לפרילנסרים ומוזיקאים",
    url: "https://seder.app",
    siteName: "Seder",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seder",
    description: "ניהול הכנסות לפרילנסרים ומוזיקאים",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${ploni.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
