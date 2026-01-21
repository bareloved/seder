import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8 bg-[#00C853]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          מוכנים לעשות סדר?
        </h2>
        <p className="text-lg md:text-xl mb-8 text-white/90">
          התחילו לנהל את ההכנסות שלכם בחינם. בלי כרטיס אשראי.
        </p>
        <Button
          asChild
          size="lg"
          className="text-lg px-8 py-6 bg-white text-[#00C853] hover:bg-white/90"
        >
          <Link href="/sign-in">התחילו עכשיו</Link>
        </Button>
      </div>
    </section>
  );
}
