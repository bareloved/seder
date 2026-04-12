import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center justify-center" aria-label="סדר">
            <svg viewBox="120 240 784 560" className="w-7 h-7 text-brand-primary" aria-hidden="true">
              <g transform="translate(512, 500) rotate(-8)">
                <rect x="-320" y="78" width="640" height="120" rx="60" fill="currentColor" opacity="0.85" />
                <rect x="-270" y="-60" width="540" height="120" rx="60" fill="currentColor" opacity="0.92" />
                <rect x="-210" y="-198" width="420" height="120" rx="60" fill="currentColor" />
              </g>
            </svg>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              תנאי שימוש
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              מדיניות פרטיות
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} סדר. כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  );
}
