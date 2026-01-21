import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionWrapper } from "./SectionWrapper";

const testimonials = [
  {
    initials: "",
    bgColor: "bg-pink-100",
    textColor: "text-pink-600",
  },
  {
    initials: "",
    bgColor: "bg-sky-100",
    textColor: "text-sky-600",
  },
  {
    initials: "",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
];

export function Testimonials() {
  return (
    <SectionWrapper id="testimonials" className="bg-purple-50/30">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          פרילנסרים כמוכם כבר משתמשים
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <Card
            key={index}
            className="group hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-6">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              {/* Placeholder text lines */}
              <div className="space-y-2 mb-6">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${testimonial.bgColor} ${testimonial.textColor} font-semibold`}>
                  {testimonial.initials}
                </div>
                <div>
                  {/* Placeholder name */}
                  <div className="h-3 bg-muted rounded w-20 mb-1.5" />
                  {/* Placeholder role */}
                  <div className="h-2.5 bg-muted/70 rounded w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
