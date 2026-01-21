import { LogIn, PlusCircle, Eye } from "lucide-react";
import { SectionWrapper } from "./SectionWrapper";

const steps = [
  {
    number: 1,
    icon: LogIn,
    title: "התחברו",
    description: "היכנסו עם Google או אימייל",
  },
  {
    number: 2,
    icon: PlusCircle,
    title: "הוסיפו עבודות",
    description: "הקלידו ידנית או ייבאו מהיומן",
  },
  {
    number: 3,
    icon: Eye,
    title: "עקבו אחרי התשלומים",
    description: "ראו בדיוק כמה מגיע לכם",
  },
];

export function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works" className="bg-orange-50/30">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">איך זה עובד?</h2>
        <p className="text-lg text-muted-foreground">
          שלושה צעדים פשוטים להתחלה
        </p>
      </div>

      <div className="relative">
        {/* Connector line - desktop only */}
        <div className="hidden md:block absolute top-16 inset-x-0 h-0.5 bg-border" />

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Mobile connector line */}
              {index < steps.length - 1 && (
                <div className="md:hidden absolute top-full start-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />
              )}

              {/* Step circle */}
              <div className="relative z-10 mx-auto mb-6 flex items-center justify-center w-32 h-32 rounded-full bg-background border-2 border-primary">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary mb-1">
                    {step.number}
                  </span>
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
