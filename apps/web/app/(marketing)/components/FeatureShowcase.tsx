"use client";

import {
  FileText,
  Calendar,
  TrendingUp,
  Wallet,
  Smartphone,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionWrapper } from "./SectionWrapper";

const features = [
  {
    icon: Calendar,
    title: "ייבוא מהיומן",
    description: "חיברתם Google? כל ההופעות, השיעורים והפגישות מיובאים אוטומטית. פחות הקלדות, יותר זמן למוזיקה.",
    bgColor: "bg-sky-50",
    iconColor: "text-sky-500",
  },
  {
    icon: FileText,
    title: "מעקב חשבוניות",
    description: "סמנו מה נשלח ומה לא. תמיד תדעו בדיוק כמה כסף מחכה לחשבונית.",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    icon: Wallet,
    title: "ניהול תשלומים",
    description: "עבודה בוצעה? חשבונית נשלחה? תשלום התקבל? הכל במקום אחד, בלי לשכוח כלום.",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    icon: TrendingUp,
    title: "תמונת מצב חודשית",
    description: "ראו כמה הרווחתם החודש, מה הטרנד לעומת חודש שעבר, ואיפה הכסף באמת.",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    icon: Smartphone,
    title: "עובד בכל מקום",
    description: "בין הופעות? בדרך לשיעור? הוסיפו עבודה או בדקו סטטוס תשלום ישר מהנייד.",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  {
    icon: Shield,
    title: "פרטיות מלאה",
    description: "המידע שלכם נשאר שלכם. אין פרסומות, אין מכירת מידע, אין הפתעות.",
    bgColor: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

export function FeatureShowcase() {
  return (
    <SectionWrapper id="features" className="bg-gradient-to-b from-sky-50/50 to-white">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          כל מה שצריך בשביל לנהל הכנסות
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          בנינו את סדר בשביל פרילנסרים כמונו - פשוט, מהיר, ובלי סיבוכים מיותרים
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card
            key={feature.title}
            className="group hover:shadow-lg transition-all duration-300 border-slate-200/60 hover:border-[#2ecc71]/30 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className={`mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bgColor} ${feature.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
