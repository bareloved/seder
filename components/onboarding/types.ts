export type TourStepType = "modal" | "spotlight";

export interface TourStep {
  id: string;
  type: TourStepType;
  targetSelector?: string; // CSS selector for spotlight target
  title: string;
  content: string;
  action?: string; // Primary button text
  secondaryAction?: string; // Secondary button text (e.g., "skip")
  prefillExample?: boolean; // Whether to pre-fill form with example data
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  hasCompletedOnboarding: boolean;
}

// Example income entry for pre-filling in step 2
export const EXAMPLE_INCOME_ENTRY = {
  description: "הופעה בחתונה",
  clientName: "דוד כהן",
  amountGross: 1500,
  date: new Date().toISOString().split("T")[0],
};

// Tour steps configuration
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    type: "modal",
    title: "ברוכים הבאים לסדר!",
    content: "נעזור לך לעקוב אחרי ההכנסות שלך בקלות. בואו נעשה סיור קצר.",
    action: "בואו נתחיל",
  },
  {
    id: "add-income",
    type: "spotlight",
    targetSelector: '[data-tour="add-button"]',
    title: "הוספת עבודה ראשונה",
    content: "לחץ כאן כדי להוסיף את העבודה הראשונה שלך. מילאנו לך דוגמה להתחלה.",
    action: "הוסף עבודה",
    prefillExample: true,
  },
  {
    id: "view-income",
    type: "spotlight",
    targetSelector: '[data-tour="income-table"]',
    title: "העבודה נוספה!",
    content: "מעולה! העבודה החדשה שלך מופיעה כאן. תוכל לערוך אותה בכל עת בלחיצה עליה.",
    action: "הבנתי",
  },
  {
    id: "calendar-connected",
    type: "spotlight",
    targetSelector: '[data-tour="calendar-import"]',
    title: "ייבוא מהיומן",
    content: "חבר את יומן Google שלך לייבוא אוטומטי של אירועים לסדר.",
    action: "חיבור יומן",
    secondaryAction: "אולי אחר כך",
  },
  {
    id: "calendar-not-connected",
    type: "modal",
    title: "ייבוא מהיומן",
    content: "תוכל לחבר את יומן Google שלך בהגדרות כדי לייבא אירועים אוטומטית לסדר.",
    action: "המשך",
  },
  {
    id: "complete",
    type: "modal",
    title: "מעולה!",
    content: "אתה מוכן להתחיל לעקוב אחרי ההכנסות שלך. בהצלחה!",
    action: "סיום",
  },
];
