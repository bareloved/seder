import { LogIn, CalendarPlus, BarChart3, ArrowLeft } from "lucide-react";
import { SectionWrapper } from "./SectionWrapper";

const steps = [
  {
    number: 1,
    icon: LogIn,
    title: "התחברו",
    description: "היכנסו עם Google ותקבלו גישה מיידית ליומן שלכם",
    color: "bg-sky-500",
  },
  {
    number: 2,
    icon: CalendarPlus,
    title: "הוסיפו עבודות",
    description: "ייבאו אירועים מהיומן או הוסיפו ידנית - הכל נשמר אוטומטית",
    color: "bg-[#2ecc71]",
  },
  {
    number: 3,
    icon: BarChart3,
    title: "עקבו אחרי הכסף",
    description: "ראו בדיוק כמה מגיע לכם, מה שולם ומה מחכה לחשבונית",
    color: "bg-amber-500",
  },
];

export function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works" className="bg-slate-50">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">איך זה עובד?</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          שלושה צעדים פשוטים ואתם מסודרים
        </p>
      </div>

      {/* Desktop: Horizontal steps */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-start">
              {/* Step card */}
              <div className="flex flex-col items-center text-center w-56">
                {/* Icon circle */}
                <div className={`${step.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-black/10`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Number badge */}
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-sm font-bold mb-3">
                  {step.number}
                </span>

                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="flex items-center px-4 pt-6">
                  <ArrowLeft className="w-6 h-6 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical steps */}
      <div className="md:hidden space-y-6">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="absolute top-16 start-7 w-0.5 h-[calc(100%+1.5rem)] bg-slate-200" />
            )}

            <div className="flex gap-5">
              {/* Icon */}
              <div className={`${step.color} w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/10 relative z-10`}>
                <step.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
