export type TourStepType = "modal" | "spotlight";

export interface TourStep {
  id: string;
  type: TourStepType;
  targetSelector?: string; // CSS selector for spotlight target
  title: string;
  content: string;
  action?: string; // Primary button text
  secondaryAction?: string; // Secondary button text (e.g., "skip")
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  hasCompletedOnboarding: boolean;
}

// Tour steps configuration
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    type: "modal",
    title: "ברוכים הבאים לסדר!",
    content: "בואו נכיר את הכלים שיעזרו לכם לעקוב אחרי ההכנסות.",
    action: "בואו נתחיל",
  },
  {
    id: "add-income",
    type: "spotlight",
    targetSelector: '[data-tour="add-button"]',
    title: "הוספת עבודה",
    content: "כאן תוכלו להוסיף עבודות חדשות ולעקוב אחרי חשבוניות ותשלומים.",
    action: "הבא",
  },
  {
    id: "calendar-connected",
    type: "spotlight",
    targetSelector: '[data-tour="calendar-import"]',
    title: "ייבוא מיומן Google",
    content: "אפשר לייבא אירועים ישירות מהיומן ולהפוך אותם להכנסות.",
    action: "הבא",
  },
  {
    id: "calendar-not-connected",
    type: "modal",
    title: "ייבוא מיומן Google",
    content: "אפשר לחבר את יומן Google בהגדרות כדי לייבא אירועים אוטומטית.",
    action: "הבא",
  },
  {
    id: "navigation",
    type: "spotlight",
    targetSelector: '[data-tour="navigation"]',
    title: "ניווט באפליקציה",
    content: "מכאן תוכלו לעבור בין הכנסות, דוחות, לקוחות והגדרות.",
    action: "הבא",
  },
  {
    id: "analytics",
    type: "spotlight",
    targetSelector: '[data-tour="nav-analytics"]',
    title: "דוחות וניתוחים",
    content: "כאן תוכלו לראות סיכומים, גרפים ומעקב אחרי הביצועים שלכם.",
    action: "הבא",
  },
  {
    id: "clients",
    type: "spotlight",
    targetSelector: '[data-tour="nav-clients"]',
    title: "ניהול לקוחות",
    content: "כאן תוכלו לנהל את הלקוחות שלכם ולראות נתונים על כל לקוח.",
    action: "הבא",
  },
  {
    id: "complete",
    type: "modal",
    title: "יאללה תהנו!",
    content: "זהו, אתם מוכנים. בהצלחה עם ההכנסות!",
    action: "סיום",
  },
];
