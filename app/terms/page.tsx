import type { Metadata } from "next";
import { LandingHeader } from "../(marketing)/components/LandingHeader";
import { LandingFooter } from "../(marketing)/components/LandingFooter";
import { SectionWrapper } from "../(marketing)/components/SectionWrapper";

export const metadata: Metadata = {
  title: "תנאי שימוש | סדר",
  description: "תנאי השימוש של סדר - ניהול הכנסות לפרילנסרים. קראו את התנאים וההגבלות לשימוש בשירות.",
  openGraph: {
    locale: "he_IL",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingHeader />
      <SectionWrapper>
        <article className="prose prose-neutral dark:prose-invert max-w-none" dir="rtl">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">תנאי שימוש</h1>
          <p className="text-muted-foreground text-center mb-12">עדכון אחרון: ינואר 2025</p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">1. הסכמה לתנאים</h2>
            <p>
              ברוכים הבאים לסדר (להלן: &quot;האתר&quot;, &quot;השירות&quot; או &quot;אנחנו&quot;).
              השימוש בשירות מהווה הסכמה מלאה לתנאי שימוש אלה. אם אינכם מסכימים לתנאים אלה, אנא הימנעו משימוש בשירות.
            </p>
            <p className="mt-3">
              אנו שומרים על הזכות לעדכן תנאים אלה בכל עת. שינויים מהותיים יפורסמו באתר ותישלח הודעה למשתמשים רשומים.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. תיאור השירות</h2>
            <p>
              סדר הוא שירות מקוון לניהול הכנסות המיועד לפרילנסרים ונותני שירותים עצמאיים. השירות מאפשר:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>רישום ומעקב אחר הכנסות מלקוחות</li>
              <li>ניהול סטטוס חשבוניות ותשלומים</li>
              <li>סיווג הכנסות לפי קטגוריות מותאמות אישית</li>
              <li>צפייה בדוחות, ניתוחים ומדדי ביצוע (KPIs)</li>
              <li>ייבוא אירועים מ-Google Calendar</li>
            </ul>
            <p className="mt-3">
              <strong>השירות אינו מהווה תחליף לייעוץ חשבונאי, מיסויי או משפטי מקצועי.</strong>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">3. חשבון משתמש</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">3.1 יצירת חשבון</h3>
            <p>
              לשימוש בשירות נדרשת יצירת חשבון עם כתובת דוא&quot;ל תקינה. אתם אחראים לספק מידע מדויק ולעדכן אותו בעת הצורך.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 אבטחת החשבון</h3>
            <p>
              אתם אחראים לשמירה על סודיות פרטי הגישה לחשבון שלכם. עליכם להודיע לנו מיידית על כל שימוש לא מורשה בחשבונכם.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 חשבון אחד לכל משתמש</h3>
            <p>
              כל משתמש רשאי להחזיק חשבון אחד בלבד. יצירת חשבונות מרובים עלולה להוביל להשעיה או סגירת כל החשבונות.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">4. שימוש מותר</h2>
            <p>אתם מתחייבים להשתמש בשירות אך ורק למטרות חוקיות ובהתאם לתנאים אלה. בפרט, אתם מתחייבים:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>לא להשתמש בשירות לפעילות בלתי חוקית או הונאה</li>
              <li>לא לנסות לגשת למערכות או נתונים שאינם שלכם</li>
              <li>לא להפריע לפעילות השירות או לפגוע בו</li>
              <li>לא להעביר וירוסים, קוד זדוני או חומר מזיק</li>
              <li>לא להשתמש בשירות בדרך שעלולה להטעות אחרים</li>
              <li>לא לאסוף מידע על משתמשים אחרים</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">5. תוכן המשתמש</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">5.1 בעלות</h3>
            <p>
              אתם שומרים על כל זכויות הבעלות בתוכן שאתם מזינים לשירות (רשומות הכנסה, שמות לקוחות, קטגוריות וכו&apos;).
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">5.2 רישיון שימוש</h3>
            <p>
              אתם מעניקים לנו רישיון מוגבל להשתמש בתוכן שלכם אך ורק לצורך אספקת השירות, כולל אחסון, עיבוד והצגה.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">5.3 אחריות לתוכן</h3>
            <p>
              אתם אחראים לוודא שהתוכן שאתם מזינים אינו מפר זכויות של צדדים שלישיים ואינו בלתי חוקי.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. חיבור Google Calendar</h2>
            <p>
              אם תבחרו לחבר את חשבון Google שלכם, אתם מאשרים לנו לגשת לנתוני לוח השנה שלכם בהתאם להרשאות שנתתם.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>החיבור הוא וולונטרי ואפשר לנתק אותו בכל עת</li>
              <li>אנו ניגש רק לנתונים הנדרשים לייבוא אירועים</li>
              <li>ניתוק החיבור לא ימחק נתונים שכבר יובאו לשירות</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">7. קניין רוחני</h2>
            <p>
              כל הזכויות בשירות, כולל קוד המקור, העיצוב, הלוגו, הטקסטים והתכנים שאינם תוכן משתמש, שייכות לסדר או לבעלי הרישיון שלנו.
            </p>
            <p className="mt-3">
              אינכם רשאים להעתיק, לשנות, להפיץ או ליצור יצירות נגזרות מהשירות ללא אישור בכתב מראש.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">8. הגבלת אחריות</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">8.1 השירות &quot;כמות שהוא&quot;</h3>
            <p>
              השירות מסופק &quot;כמות שהוא&quot; (AS IS) ו&quot;כפי שזמין&quot; (AS AVAILABLE) ללא אחריות מכל סוג, מפורשת או משתמעת.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">8.2 אי-התחייבות לזמינות</h3>
            <p>
              אנו לא מתחייבים שהשירות יהיה זמין ללא הפרעות, נקי משגיאות או מאובטח לחלוטין.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">8.3 הגבלת נזקים</h3>
            <p>
              בשום מקרה לא נהיה אחראים לנזקים עקיפים, מיוחדים, תוצאתיים או עונשיים, כולל אובדן רווחים, נתונים או מוניטין, גם אם הודענו על האפשרות לנזקים כאלה.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">8.4 אחריות מקסימלית</h3>
            <p>
              אחריותנו המקסימלית הכוללת בכל הנסיבות לא תעלה על הסכום ששילמתם לנו (אם בכלל) בשנים עשר החודשים שקדמו לאירוע.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">9. שיפוי</h2>
            <p>
              אתם מתחייבים לשפות ולהגן עלינו, על עובדינו, מנהלינו ושותפינו מפני כל תביעה, נזק, הפסד או הוצאה (כולל שכר טרחת עורכי דין) הנובעים משימושכם בשירות או מהפרת תנאים אלה.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">10. סיום והשעיה</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">10.1 סיום על ידי המשתמש</h3>
            <p>
              תוכלו לסגור את חשבונכם בכל עת דרך הגדרות החשבון. לאחר הסגירה, הנתונים שלכם יימחקו בהתאם למדיניות הפרטיות שלנו.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">10.2 סיום או השעיה על ידינו</h3>
            <p>
              אנו רשאים להשעות או לסגור את חשבונכם אם:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>הפרתם את תנאי השימוש</li>
              <li>השימוש שלכם מהווה סיכון לשירות או למשתמשים אחרים</li>
              <li>נדרש על פי חוק</li>
              <li>השירות מופסק</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">11. שינויים בשירות</h2>
            <p>
              אנו רשאים לשנות, לעדכן או להפסיק את השירות (או חלקים ממנו) בכל עת, עם או ללא הודעה מוקדמת. לא נהיה אחראים כלפיכם או כלפי צד שלישי בגין שינויים, השעיה או הפסקה של השירות.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">12. דין חל וסמכות שיפוט</h2>
            <p>
              תנאים אלה יפורשו בהתאם לחוקי מדינת ישראל, ללא התחשבות בכללי ברירת הדין שלה.
            </p>
            <p className="mt-3">
              כל מחלוקת הנובעת מתנאים אלה או מהשימוש בשירות תידון בבתי המשפט המוסמכים בתל אביב-יפו, ואתם מסכימים לסמכות השיפוט הייחודית של בתי משפט אלה.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">13. הפרדת סעיפים</h2>
            <p>
              אם סעיף כלשהו בתנאים אלה יימצא בלתי תקף או בלתי ניתן לאכיפה, שאר הסעיפים ימשיכו לחול במלואם.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">14. ויתור</h2>
            <p>
              אי-אכיפה של זכות או סעיף מתנאים אלה לא תהווה ויתור על אותה זכות או סעיף.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">15. יצירת קשר</h2>
            <p>
              לשאלות בנוגע לתנאי השימוש, אנא פנו אלינו:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>דוא&quot;ל:</strong> support@seder.app</li>
            </ul>
          </section>
        </article>
      </SectionWrapper>
      <LandingFooter />
    </main>
  );
}
