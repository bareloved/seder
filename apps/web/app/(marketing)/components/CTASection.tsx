import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-16 md:py-24 px-4 md:px-6 lg:px-8 bg-gradient-to-br from-[#2ecc71] via-[#27ae60] to-[#1e8449] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          מוכנים לעשות סדר?
        </h2>
        <p className="text-lg md:text-xl mb-8 text-white/90">
          התחילו לנהל את ההכנסות שלכם היום - בחינם.
        </p>
        <Button
          asChild
          size="lg"
          className="text-lg px-8 py-6 bg-white text-[#2ecc71] hover:bg-white/90 group"
        >
          <Link href="/sign-in">
            התחילו עכשיו
            <ArrowLeft className="w-5 h-5 me-2 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
