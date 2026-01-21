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
    icon: FileText,
    title: "מעקב חשבוניות",
    description: "נהלו את כל החשבוניות במקום אחד",
  },
  {
    icon: Calendar,
    title: "ייבוא מיומן",
    description: "ייבאו עבודות אוטומטית מהיומן",
  },
  {
    icon: TrendingUp,
    title: "תמונת מצב חודשית",
    description: "ראו כמה הרווחתם במבט אחד",
  },
  {
    icon: Wallet,
    title: "ניהול תשלומים",
    description: "סמנו מה שולם ומה עדיין פתוח",
  },
  {
    icon: Smartphone,
    title: "עובד בכל מקום",
    description: "מותאם לסלולר",
  },
  {
    icon: Shield,
    title: "פרטיות מלאה",
    description: "המידע שלכם נשאר שלכם",
  },
];

export function FeatureShowcase() {
  return (
    <SectionWrapper id="features" className="bg-muted/30">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          הכל מה שצריך בשביל לנהל הכנסות
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20"
          >
            <CardContent className="p-6">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
