import { LoginForm } from "@/components/login-form"

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-[#2ecc71] via-[#27ae60] to-[#1e8449] overflow-hidden">
      {/* Abstract shapes */}
      <div className="absolute inset-0">
        {/* Large circle top-right */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10" />
        {/* Medium circle bottom-left */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        {/* Small circle center-left */}
        <div className="absolute top-1/3 left-10 w-32 h-32 rounded-full bg-white/10" />
        {/* Dots pattern */}
        <div className="absolute top-20 right-20 grid grid-cols-4 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/20" />
          ))}
        </div>
        {/* Lines */}
        <div className="absolute bottom-32 right-16 w-24 h-px bg-white/30" />
        <div className="absolute bottom-28 right-20 w-16 h-px bg-white/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-12">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="text-3xl font-bold">סדר</span>
        </div>

        <h2 className="text-2xl font-semibold mb-3">סדר בהכנסות, סדר בחיים</h2>
        <p className="text-white/80 text-lg max-w-sm mx-auto leading-relaxed">
          הכלי הפשוט והחכם לניהול הכנסות לפרילנסרים
        </p>

        {/* Feature highlights */}
        <div className="mt-12 space-y-4 text-start max-w-xs mx-auto">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span>ייבוא אוטומטי מ-Google Calendar</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>מעקב חשבוניות ותשלומים</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span>דוחות וניתוח הכנסות</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-svh grid lg:grid-cols-2" dir="rtl">
      {/* Form side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-white dark:bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo - only shows on small screens */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#2ecc71] flex items-center justify-center text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">סדר</span>
          </div>

          <LoginForm />
        </div>
      </div>

      {/* Brand panel - desktop only */}
      <BrandPanel />
    </div>
  )
}
