import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionWrapper } from "./SectionWrapper";

const testimonials = [
  {
    quote: "סוף סוף יש לי מקום אחד לכל ההכנסות",
    name: "יעל כ.",
    role: "מעצבת גרפית",
    initials: "יכ",
  },
  {
    quote: "הייבוא מהיומן חסך לי שעות של עבודה",
    name: "אמיר ש.",
    role: "צלם פרילנס",
    initials: "אש",
  },
  {
    quote: "עכשיו אני יודע בדיוק כמה עוד מגיע לי",
    name: "מיכל ר.",
    role: "יועצת שיווק",
    initials: "מר",
  },
];

export function Testimonials() {
  return (
    <SectionWrapper id="testimonials" className="bg-muted/30">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          פרילנסרים כמוכם כבר משתמשים
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <Card
            key={testimonial.name}
            className="group hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-6">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-lg mb-6 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
