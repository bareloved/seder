import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingHeader } from "./(marketing)/components/LandingHeader";
import { LandingHero } from "./(marketing)/components/LandingHero";
import { FeatureShowcase } from "./(marketing)/components/FeatureShowcase";
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
      <HowItWorks />
      <Testimonials />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
