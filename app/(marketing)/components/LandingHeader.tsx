"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-primary text-white shadow-sm" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-white" />
            <span className="font-bold text-xl">סדר</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              תכונות
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              איך זה עובד
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              חוות דעת
            </button>
          </nav>

          <Button asChild size="lg" variant="secondary" className="bg-white text-brand-primary hover:bg-white/90">
            <Link href="/sign-in">התחברות</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
