"use client";

import {
  Wallet,
  CalendarPlus,
  FileText,
  Banknote,
  BarChart3,
  PieChart,
  Users,
  Tags,
  Percent,
  BellRing,
  Download,
  Smartphone,
  RefreshCw,
  Bell,
  Languages,
  ShieldCheck,
  Gift,
  Heart,
} from "lucide-react";
import { SectionWrapper } from "./SectionWrapper";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
}

const coreFeatures: Feature[] = [
  { icon: Wallet, label: "ניהול הכנסות במקום אחד", color: "text-emerald-500", bg: "bg-emerald-50" },
  { icon: CalendarPlus, label: "ייבוא אוטומטי מיומן גוגל", color: "text-sky-500", bg: "bg-sky-50" },
  { icon: FileText, label: "מעקב סטטוס חשבוניות", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Banknote, label: "מעקב תשלומים ותזכורות", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: BarChart3, label: "דשבורד חודשי עם KPIs", color: "text-violet-500", bg: "bg-violet-50" },
  { icon: PieChart, label: "אנליטיקס וגרפים", color: "text-pink-500", bg: "bg-pink-50" },
  { icon: Users, label: "ניהול לקוחות והיסטוריה", color: "text-indigo-500", bg: "bg-indigo-50" },
  { icon: Tags, label: "קטגוריות מותאמות אישית", color: "text-teal-500", bg: "bg-teal-50" },
  { icon: Percent, label: "חישוב מע״מ אוטומטי", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: BellRing, label: "תזכורות חכמות לחשבוניות", color: "text-rose-500", bg: "bg-rose-50" },
  { icon: Download, label: "ייצוא נתונים בכל זמן", color: "text-cyan-500", bg: "bg-cyan-50" },
  { icon: Smartphone, label: "אפליקציית אייפון + אתר", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: RefreshCw, label: "סנכרון בין מכשירים", color: "text-sky-500", bg: "bg-sky-50" },
  { icon: Bell, label: "התראות פוש לנייד", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: Languages, label: "עברית מלאה, ימין לשמאל", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: ShieldCheck, label: "פרטיות מלאה — בלי פרסומות", color: "text-slate-600", bg: "bg-slate-100" },
];

const emotionalFeatures: Feature[] = [
  { icon: Gift, label: "...וכל העדכונים העתידיים!", color: "text-emerald-500", bg: "bg-emerald-50" },
  { icon: Heart, label: "תמיכה ביוצר עצמאי ישראלי ❤️", color: "text-rose-500", bg: "bg-rose-50" },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div
      className="flex items-center gap-3 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg ${feature.bg} ${feature.color} flex items-center justify-center`}
      >
        <feature.icon className="w-5 h-5" />
      </div>
      <span className="text-base font-medium text-slate-700">
        {feature.label}
      </span>
    </div>
  );
}

export function FeatureList() {
  return (
    <SectionWrapper id="all-features" className="bg-gradient-to-b from-white to-slate-50/80">
      <div className="text-center mb-10 md:mb-14">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          הכל כלול, בלי הפתעות
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          כל הכלים שצריך בשביל לנהל הכנסות בצורה מסודרת
        </p>
      </div>

      <div
        dir="rtl"
        className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4"
      >
        {coreFeatures.map((feature, i) => (
          <FeatureRow key={feature.label} feature={feature} index={i} />
        ))}
      </div>

      <div
        dir="rtl"
        className="max-w-3xl mx-auto mt-8 pt-6 border-t border-slate-200/60"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {emotionalFeatures.map((feature, i) => (
            <FeatureRow
              key={feature.label}
              feature={feature}
              index={coreFeatures.length + i}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
