import type { Metadata } from "next";
import { LandingHeader } from "../(marketing)/components/LandingHeader";
import { LandingFooter } from "../(marketing)/components/LandingFooter";
import { SectionWrapper } from "../(marketing)/components/SectionWrapper";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | סדר",
  description: "מדיניות הפרטיות של סדר - ניהול הכנסות לפרילנסרים. מידע על איסוף, שמירה והגנה על הנתונים שלכם.",
  openGraph: {
    locale: "he_IL",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingHeader />
      <SectionWrapper>
        <article className="prose prose-neutral dark:prose-invert max-w-none" dir="rtl">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">מדיניות פרטיות</h1>
          <p className="text-muted-foreground text-center mb-12">עדכון אחרון: ינואר 2025</p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">1. מבוא</h2>
            <p>
              ברוכים הבאים למדיניות הפרטיות של סדר (להלן: &quot;האתר&quot;, &quot;השירות&quot; או &quot;אנחנו&quot;).
              אנו מכבדים את פרטיותכם ומחויבים להגן על המידע האישי שלכם.
              מדיניות זו מסבירה כיצד אנו אוספים, משתמשים, שומרים ומגנים על המידע שלכם בעת השימוש בשירות ניהול ההכנסות שלנו.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. המידע שאנו אוספים</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">2.1 מידע שאתם מספקים לנו</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>פרטי חשבון:</strong> כתובת דוא&quot;ל, סיסמה מוצפנת, שם מלא</li>
              <li><strong>רשומות הכנסה:</strong> תיאור עבודה, שם לקוח, סכומים (ברוטו ונטו), תאריכים, סטטוס חשבונית ותשלום</li>
              <li><strong>קטגוריות:</strong> קטגוריות מותאמות אישית שיצרתם לסיווג הכנסות</li>
              <li><strong>העדפות משתמש:</strong> הגדרות תצוגה, מסננים שמורים והעדפות אחרות</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 מידע מחיבור Google Calendar</h3>
            <p>
              אם תבחרו לחבר את חשבון Google שלכם, אנו ניגש לנתונים הבאים:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>אירועי לוח שנה:</strong> כותרת, תאריך, שעה ומיקום של אירועים לצורך ייבוא כרשומות הכנסה</li>
              <li><strong>טוקני OAuth:</strong> אסימוני גישה ורענון מאובטחים לשימוש ב-API של Google</li>
              <li><strong>פרטי פרופיל Google:</strong> שם וכתובת דוא&quot;ל לצורך זיהוי החשבון</li>
            </ul>
            <p className="mt-3">
              <strong>חשוב:</strong> אנו לא קוראים, משנים או מוחקים אירועים מלוח השנה שלכם. אנו רק מייבאים מידע לצורך יצירת רשומות הכנסה.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 מידע שנאסף אוטומטית</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>כתובת IP ומידע גיאוגרפי כללי</li>
              <li>סוג דפדפן ומערכת הפעלה</li>
              <li>זמני גישה ודפוסי שימוש</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">3. כיצד אנו משתמשים במידע</h2>
            <p>אנו משתמשים במידע שנאסף למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>אספקת שירותי ניהול ההכנסות והפעלת החשבון שלכם</li>
              <li>סנכרון נתונים מ-Google Calendar לרשומות הכנסה</li>
              <li>הצגת ניתוחים, דוחות ומדדי ביצוע (KPIs)</li>
              <li>שיפור השירות והתאמתו לצרכים שלכם</li>
              <li>תקשורת עמכם בנוגע לשירות, עדכונים ותמיכה</li>
              <li>אבטחת השירות ומניעת שימוש לרעה</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">4. אחסון ואבטחת מידע</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">4.1 אחסון נתונים</h3>
            <p>
              הנתונים שלכם מאוחסנים במסד נתונים PostgreSQL מאובטח. אנו משתמשים בתשתית ענן מוגנת עם הצפנה בזמן העברה (TLS) ובמנוחה.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.2 אמצעי אבטחה</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>הצפנת סיסמאות באמצעות אלגוריתם bcrypt</li>
              <li>הצפנת תקשורת באמצעות HTTPS/TLS</li>
              <li>בידוד נתונים ברמת המשתמש (Row-Level Security)</li>
              <li>אחסון מאובטח של טוקני OAuth</li>
              <li>גיבויים אוטומטיים של מסד הנתונים</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">4.3 שמירת נתונים</h3>
            <p>
              אנו שומרים את המידע שלכם כל עוד החשבון שלכם פעיל. לאחר מחיקת חשבון, נתונים יימחקו לצמיתות תוך 30 יום, למעט מידע שאנו מחויבים לשמור על פי חוק.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">5. שיתוף מידע עם צדדים שלישיים</h2>
            <p>
              אנו <strong>לא מוכרים, משכירים או משתפים</strong> את המידע האישי שלכם עם צדדים שלישיים למטרות שיווק.
            </p>
            <p className="mt-3">אנו עשויים לשתף מידע רק במקרים הבאים:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>ספקי שירות:</strong> חברות אירוח ותשתית ענן הנחוצות להפעלת השירות</li>
              <li><strong>Google:</strong> לצורך אימות OAuth וגישה ל-Calendar API</li>
              <li><strong>דרישה חוקית:</strong> אם נדרש על פי חוק, צו בית משפט או הליך משפטי</li>
              <li><strong>הגנה על זכויות:</strong> להגנה על הזכויות, הרכוש או הבטיחות שלנו או של משתמשים אחרים</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. עוגיות ואחסון מקומי</h2>
            <p>אנו משתמשים בעוגיות ואחסון מקומי (Local Storage) למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>עוגיות סשן:</strong> לשמירת מצב ההתחברות שלכם</li>
              <li><strong>אחסון מקומי:</strong> לשמירת העדפות תצוגה ומסננים</li>
              <li><strong>אבטחה:</strong> טוקני CSRF להגנה מפני התקפות</li>
            </ul>
            <p className="mt-3">
              אנו לא משתמשים בעוגיות של צדדים שלישיים למעקב או פרסום.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">7. הזכויות שלכם</h2>
            <p>בהתאם לחוקי הפרטיות החלים, יש לכם את הזכויות הבאות:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>זכות גישה:</strong> לקבל עותק של המידע האישי שלכם</li>
              <li><strong>זכות תיקון:</strong> לתקן מידע שגוי או לא מדויק</li>
              <li><strong>זכות מחיקה:</strong> לבקש מחיקה של המידע שלכם</li>
              <li><strong>זכות ייצוא:</strong> לייצא את הנתונים שלכם בפורמט קריא</li>
              <li><strong>זכות ביטול חיבור:</strong> לנתק את חיבור Google Calendar בכל עת</li>
            </ul>
            <p className="mt-3">
              לממש את הזכויות שלכם, פנו אלינו באמצעות פרטי הקשר המפורטים בסוף מסמך זה.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">8. שימוש על ידי קטינים</h2>
            <p>
              השירות מיועד למשתמשים בגיל 18 ומעלה. אנו לא אוספים ביודעין מידע מקטינים. אם נודע לנו שאספנו מידע מקטין, נמחק אותו מיידית.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">9. שינויים במדיניות</h2>
            <p>
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר ותישלח הודעה לכתובת הדוא&quot;ל שלכם. המשך השימוש בשירות לאחר עדכון מהווה הסכמה למדיניות המעודכנת.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">10. יצירת קשר</h2>
            <p>
              לשאלות או בקשות בנוגע למדיניות הפרטיות שלנו, אנא פנו אלינו:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>דוא&quot;ל:</strong> privacy@seder.app</li>
            </ul>
          </section>
        </article>
      </SectionWrapper>
      <LandingFooter />
    </main>
  );
}
