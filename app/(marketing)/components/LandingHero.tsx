import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "./SectionWrapper";
import {
  FileText,
  Wallet,
  Calendar,
  TrendingUp,
  ClipboardList,
  Users,
  BarChart3,
  CheckCircle2,
  Send,
  Plus,
} from "lucide-react";

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Main Dashboard Window */}
      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Navbar */}
        <div className="bg-brand-primary px-4 py-3 flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-6">
            <ClipboardList className="w-6 h-6 text-white" />
            <nav className="hidden sm:flex items-center gap-6 text-sm text-white/90">
              <span className="font-medium text-white">הכנסות</span>
              <span className="opacity-70">לקוחות</span>
              <span className="opacity-70">דוחות</span>
            </nav>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30">
            <img
              src="https://api.dicebear.com/9.x/avataaars/svg?seed=Sophie&backgroundColor=ffffff&skinColor=ffdbb4"
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="p-4">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-4" dir="rtl">
            <h2 className="text-lg font-semibold text-gray-800">ינואר 2025</h2>
            <button className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* KPI Cards - Real Seder KPIs */}
          <div className="grid grid-cols-4 gap-2 mb-4" dir="rtl">
            <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
              <span className="text-[10px] text-slate-500 block">סה״כ ינואר</span>
              <div className="text-base font-semibold text-slate-900" dir="ltr">
                <span className="text-xs">₪</span> 24,500
              </div>
              <Calendar className="w-2.5 h-2.5 text-slate-400 mt-1" />
            </div>
            <div className="bg-white border border-sky-200 rounded-lg p-2 shadow-sm ring-1 ring-sky-500">
              <span className="text-[10px] text-slate-500 block">לשלוח חשבונית</span>
              <div className="text-base font-semibold text-slate-900" dir="ltr">
                <span className="text-xs">₪</span> 8,200
              </div>
              <FileText className="w-2.5 h-2.5 text-sky-500 mt-1" />
            </div>
            <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
              <span className="text-[10px] text-slate-500 block">מחכה לתשלום</span>
              <div className="text-base font-semibold text-slate-900" dir="ltr">
                <span className="text-xs">₪</span> 4,800
              </div>
              <Wallet className="w-2.5 h-2.5 text-orange-400 mt-1" />
            </div>
            <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
              <span className="text-[10px] text-slate-500 block">התקבל החודש</span>
              <div className="text-base font-semibold text-emerald-600" dir="ltr">
                <span className="text-xs">₪</span> 11,500
              </div>
              <TrendingUp className="w-2.5 h-2.5 text-emerald-500 mt-1" />
            </div>
          </div>

          {/* Income Entries List - Real Seder format */}
          <div className="space-y-2" dir="rtl">
            {/* Entry 1 - Paid */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-600">
                  שולם
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">הופעה - חתונה כהן</div>
                <div className="text-[10px] text-slate-400">15.01 · מלון דן</div>
              </div>
              <div className="text-sm font-semibold text-slate-900" dir="ltr">₪ 3,500</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600">הופעות</span>
            </div>

            {/* Entry 2 - Invoice Sent */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                </div>
                <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-600">
                  נשלחה
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">הקלטת שיר - סטודיו צליל</div>
                <div className="text-[10px] text-slate-400">12.01 · דני לוי</div>
              </div>
              <div className="text-sm font-semibold text-slate-900" dir="ltr">₪ 2,200</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">הקלטות</span>
            </div>

            {/* Entry 3 - Draft/Ready to invoice */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                </div>
                <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                  ללא
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">שיעור פסנתר</div>
                <div className="text-[10px] text-slate-400">10.01 · רותם אבני</div>
              </div>
              <div className="text-sm font-semibold text-slate-900" dir="ltr">₪ 280</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">הוראה</span>
            </div>
          </div>
        </div>

        {/* Cursor */}
        <div className="absolute bottom-8 left-1/4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-md"
          >
            <path
              d="M5 3L19 12L12 13L9 20L5 3Z"
              fill="white"
              stroke="black"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* Floating Calendar Import Card - Left */}
      <div
        className="absolute -left-4 top-20 bg-white rounded-xl shadow-xl p-3 w-44 hidden md:block"
        dir="ltr"
      >
        <div className="flex items-center gap-2 mb-3" dir="rtl">
          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-sm font-medium text-gray-800">ייבוא מהיומן</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-gray-600">הופעה בהיכל התרבות</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-gray-600">שיעור גיטרה</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20">
            <div className="w-3.5 h-3.5 border border-gray-300 rounded" />
            <span className="text-gray-600">אירוע פרטי</span>
          </div>
        </div>
        <button className="w-full mt-3 py-1.5 bg-primary text-white text-xs rounded-lg font-medium">
          ייבא נבחרים
        </button>
      </div>

      {/* Floating Mobile KPI Card - Bottom Right */}
      <div
        className="absolute -right-2 bottom-8 bg-white rounded-2xl shadow-xl p-3 w-44 hidden md:block"
        dir="rtl"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-gray-700">סיכום חודשי</span>
        </div>

        {/* Mini KPI Cards */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-sky-50 rounded-lg p-2 text-center">
            <FileText className="w-3.5 h-3.5 text-sky-500 mx-auto mb-1" />
            <div className="text-xs font-bold text-sky-700">₪ 8,200</div>
            <div className="text-[8px] text-sky-500">לשלוח חשבונית</div>
          </div>
          <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
            <Wallet className="w-3.5 h-3.5 text-orange-500 mx-auto mb-1" />
            <div className="text-xs font-bold text-orange-700">₪ 4,800</div>
            <div className="text-[8px] text-orange-500">מחכה לתשלום</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center mb-2">
          <span className="text-[10px] font-medium text-gray-500">פעולות מהירות</span>
        </div>
        <div className="flex justify-center gap-2">
          <button className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
          <button className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-sky-600" />
          </button>
          <button className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </button>
          <button className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-purple-600" />
          </button>
        </div>
      </div>

      {/* Status Summary Bubble - Bottom */}
      <div
        className="absolute -bottom-2 left-4 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 hidden md:flex"
        dir="rtl"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-gray-600">5 שולמו</span>
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-gray-600">3 נשלחו</span>
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-[10px] text-gray-600">4 ממתינים</span>
        </div>
      </div>

      {/* Category Pie Chart floating element */}
      <div className="absolute bottom-28 right-16 hidden md:block">
        <div className="bg-white rounded-xl shadow-lg p-2">
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="#fce7f3" />
            <path d="M25 5 A20 20 0 0 1 45 25 L25 25 Z" fill="#c084fc" />
            <path d="M45 25 A20 20 0 0 1 25 45 L25 25 Z" fill="#60a5fa" />
            <path d="M25 45 A20 20 0 0 1 5 25 L25 25 Z" fill="#f472b6" />
            <circle cx="25" cy="25" r="10" fill="white" />
          </svg>
          <div className="text-[8px] text-center text-gray-500 mt-1">לפי קטגוריה</div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <SectionWrapper className="pt-12 md:pt-20 bg-gradient-to-b from-[#2ecc71]/5 to-transparent">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-start animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            סדר בהכנסות,
            <br />
            <span className="text-[#2ecc71]">סדר בחיים</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
            הכלי הפשוט והחכם לניהול הכנסות לפרילנסרים.
            <br />
            עקבו אחרי עבודות, חשבוניות ותשלומים - במקום אחד.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-[#2ecc71] hover:bg-[#27ae60]">
              <Link href="/sign-in">התחילו בחינם</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[400px] md:min-h-[500px] animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <DashboardMockup />
        </div>
      </div>
    </SectionWrapper>
  );
}
