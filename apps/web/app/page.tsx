import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingHeader } from "./(marketing)/components/LandingHeader";
import { LandingHero } from "./(marketing)/components/LandingHero";
import { FeatureShowcase } from "./(marketing)/components/FeatureShowcase";
import { FeatureList } from "./(marketing)/components/FeatureList";
import { HowItWorks } from "./(marketing)/components/HowItWorks";
import { Testimonials } from "./(marketing)/components/Testimonials";
import { CTASection } from "./(marketing)/components/CTASection";
import { LandingFooter } from "./(marketing)/components/LandingFooter";

export const metadata: Metadata = {
  title: "סדר - ניהול הכנסות לפרילנסרים",
  description: "הכלי הפשוט והחכם לניהול הכנסות לפרילנסרים. עקבו אחרי עבודות, חשבוניות ותשלומים.",
  openGraph: {
    locale: "he_IL",
    type: "website",
  },
};

// Render the landing page on a fixed 1024px virtual canvas and let the browser
// scale it down to the device viewport — Instagram-style uniform shrinking.
export const viewport: Viewport = {
  width: 1024,
  initialScale: 1,
};

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/income");
  }

  return (
    <main className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <FeatureShowcase />
      <FeatureList />
      <HowItWorks />
      <Testimonials />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
