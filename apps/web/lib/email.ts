import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM || "noreply@sedder.app";

  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export function getPasswordResetEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>איפוס סיסמה - סדר</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial Hebrew', 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; direction: rtl;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
                סדר
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                איפוס סיסמה
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6; text-align: center; direction: rtl; unicode-bidi: embed;">
                &#x200F;קיבלנו בקשה לאיפוס הסיסמה שלכם.
                <br>
                &#x200F;הקוד שלכם הוא:
              </p>
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: 'Monaco', 'Consolas', monospace; direction: ltr; unicode-bidi: embed;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center; direction: rtl; unicode-bidi: embed;">
                &#x200F;הקוד יפוג תוך 5 דקות
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 32px 32px; direction: rtl;">
              <div style="background-color: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px;">
                <p style="margin: 0; font-size: 13px; color: #713f12; text-align: center; direction: rtl; unicode-bidi: embed;">
                  &#x200F;אם לא ביקשתם לאפס את הסיסמה, התעלמו מאימייל זה.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; direction: rtl;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; direction: rtl; unicode-bidi: embed;">
                &#x200F;סדר. כל הזכויות שמורות. © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getVerificationEmailHtml(url: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אימות כתובת אימייל - סדר</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial Hebrew', 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; direction: rtl;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
                סדר
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                אימות כתובת אימייל
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6; text-align: center; direction: rtl; unicode-bidi: embed;">
                &#x200F;תודה שנרשמתם לסדר!
                <br>
                &#x200F;לחצו על הכפתור למטה כדי לאמת את כתובת האימייל שלכם.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding: 0 32px 24px; text-align: center;">
              <a href="${url}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                אימות אימייל
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center; word-break: break-all; direction: rtl; unicode-bidi: embed;">
                &#x200F;אם הכפתור לא עובד, העתיקו את הקישור הבא לדפדפן:
                <br>
                <a href="${url}" style="color: #16a34a; direction: ltr; unicode-bidi: embed;">${url}</a>
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 32px 32px; direction: rtl;">
              <div style="background-color: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px;">
                <p style="margin: 0; font-size: 13px; color: #713f12; text-align: center; direction: rtl; unicode-bidi: embed;">
                  &#x200F;אם לא נרשמתם לסדר, התעלמו מאימייל זה.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; direction: rtl;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; direction: rtl; unicode-bidi: embed;">
                &#x200F;סדר. כל הזכויות שמורות. © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getVerificationEmailText(url: string): string {
  return `
אימות כתובת אימייל - סדר

תודה שנרשמתם לסדר!

לחצו על הקישור הבא כדי לאמת את כתובת האימייל שלכם:
${url}

אם לא נרשמתם לסדר, התעלמו מאימייל זה.
  `.trim();
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const greeting = name ? `שלום ${name},` : "שלום,";
  await sendEmail({
    to,
    subject: "ברוכים הבאים לסדר!",
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ברוכים הבאים לסדר</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial Hebrew', 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; direction: rtl;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
                סדר
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b; direction: rtl; unicode-bidi: embed;">
                &#x200F;ברוכים הבאים!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 16px; direction: rtl;">
              <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6; text-align: center; direction: rtl; unicode-bidi: embed;">
                &#x200F;${greeting}
                <br>
                &#x200F;החשבון שלך אומת!
                <br>
                &#x200F;הנה כמה דברים שאפשר לעשות עם האפליקציה:
              </p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; direction: rtl;">
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="width: 32px; font-size: 18px; vertical-align: top; padding-top: 2px;">📊</td>
                        <td style="direction: rtl; unicode-bidi: embed;">
                          <span style="font-size: 14px; font-weight: 600; color: #0f172a;">&#x200F;מעקב הכנסות</span>
                          <br>
                          <span style="font-size: 13px; color: #64748b;">&#x200F;ניהול חשבוניות ותשלומים במקום אחד</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; direction: rtl;">
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="width: 32px; font-size: 18px; vertical-align: top; padding-top: 2px;">📅</td>
                        <td style="direction: rtl; unicode-bidi: embed;">
                          <span style="font-size: 14px; font-weight: 600; color: #0f172a;">&#x200F;ייבוא מיומן Google</span>
                          <br>
                          <span style="font-size: 13px; color: #64748b;">&#x200F;הפכו אירועים להכנסות באופן אוטומטי</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; direction: rtl;">
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="width: 32px; font-size: 18px; vertical-align: top; padding-top: 2px;">📈</td>
                        <td style="direction: rtl; unicode-bidi: embed;">
                          <span style="font-size: 14px; font-weight: 600; color: #0f172a;">&#x200F;דוחות וניתוחים</span>
                          <br>
                          <span style="font-size: 13px; color: #64748b;">&#x200F;תמונה ברורה של ההכנסות שלכם</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; direction: rtl;">
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="width: 32px; font-size: 18px; vertical-align: top; padding-top: 2px;">🔔</td>
                        <td style="direction: rtl; unicode-bidi: embed;">
                          <span style="font-size: 14px; font-weight: 600; color: #0f172a;">&#x200F;תזכורות חכמות</span>
                          <br>
                          <span style="font-size: 13px; color: #64748b;">&#x200F;לא לשכוח חשבוניות ותשלומים</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 24px; text-align: center;">
              <a href="https://sedder.app" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                כניסה לאפליקציה
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; direction: rtl;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; direction: rtl; unicode-bidi: embed;">
                &#x200F;סדר. כל הזכויות שמורות. © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `${greeting}\n\nברוכים הבאים לסדר! החשבון שלך אומת!\nהנה כמה דברים שאפשר לעשות עם האפליקציה:\n\n📊 מעקב הכנסות — ניהול חשבוניות ותשלומים במקום אחד\n📅 ייבוא מיומן Google — הפכו אירועים להכנסות באופן אוטומטי\n📈 דוחות וניתוחים — תמונה ברורה של ההכנסות שלכם\n🔔 תזכורות חכמות — לא לשכוח חשבוניות ותשלומים\n\nכניסה: https://sedder.app`,
  });
}

export function getPasswordResetEmailText(otp: string): string {
  return `
איפוס סיסמה - סדר

קיבלנו בקשה לאיפוס הסיסמה שלכם.

הקוד שלכם: ${otp}

הקוד יפוג תוך 5 דקות.

אם לא ביקשתם לאפס את הסיסמה, התעלמו מאימייל זה.
  `.trim();
}
