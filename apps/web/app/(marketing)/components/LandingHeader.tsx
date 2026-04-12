"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className="bg-brand-primary dark:bg-[#1a3a2a] text-white shadow-sm sticky top-0 z-50 h-12 md:h-[80px] dark:border-b dark:border-border"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 sm:px-12 lg:px-20 h-full flex items-center justify-between">
        <div className="flex items-center gap-14">
          <Link href="/" className="flex items-center justify-center" aria-label="סדר">
            <svg viewBox="120 240 784 560" className="w-7 h-7 md:w-9 md:h-9" aria-hidden="true">
              <g transform="translate(512, 500) rotate(-8)">
                <rect x="-320" y="78" width="640" height="120" rx="60" fill="white" opacity="0.85" />
                <rect x="-270" y="-60" width="540" height="120" rx="60" fill="white" opacity="0.92" />
                <rect x="-210" y="-198" width="420" height="120" rx="60" fill="white" />
              </g>
            </svg>
          </Link>

          <nav className="hidden md:flex items-center gap-14">
            <button
              onClick={() => scrollToSection("features")}
              className="text-base font-normal opacity-80 hover:opacity-100 transition-opacity"
            >
              תכונות
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-base font-normal opacity-80 hover:opacity-100 transition-opacity"
            >
              איך זה עובד
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-base font-normal opacity-80 hover:opacity-100 transition-opacity"
            >
              חוות דעת
            </button>
          </nav>
        </div>

        <Button
          asChild
          size="sm"
          variant="secondary"
          className="bg-white text-brand-primary hover:bg-white/90 md:h-10 md:px-5 md:text-base"
        >
          <Link href="/sign-in">התחברות</Link>
        </Button>
      </div>
    </header>
  );
}
