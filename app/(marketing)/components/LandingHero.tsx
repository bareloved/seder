import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "./SectionWrapper";

export function LandingHero() {
  return (
    <SectionWrapper className="pt-12 md:pt-20">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-start">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            סדר בהכנסות,
            <br />
            <span className="text-primary">סדר בחיים</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
            הכלי הפשוט והחכם לניהול הכנסות לפרילנסרים.
            <br />
            עקבו אחרי עבודות, חשבוניות ותשלומים - במקום אחד.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/sign-in">התחילו בחינם</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 md:p-8">
            <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-8 bg-primary/20 rounded w-20" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 bg-primary/20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                    <div className="h-6 bg-green-500/20 rounded w-16" />
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 bg-primary/20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-2 bg-muted rounded w-2/5" />
                    </div>
                    <div className="h-6 bg-yellow-500/20 rounded w-16" />
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 bg-primary/20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-4/5" />
                      <div className="h-2 bg-muted rounded w-1/3" />
                    </div>
                    <div className="h-6 bg-green-500/20 rounded w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
