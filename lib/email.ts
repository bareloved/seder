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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; direction: rtl;">
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
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6; text-align: center;">
                קיבלנו בקשה לאיפוס הסיסמה שלכם.
                <br>
                הקוד שלכם הוא:
              </p>
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: 'Monaco', 'Consolas', monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
                הקוד יפוג תוך 5 דקות
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px;">
                <p style="margin: 0; font-size: 13px; color: #713f12; text-align: center;">
                  אם לא ביקשתם לאפס את הסיסמה, התעלמו מאימייל זה.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} סדר. כל הזכויות שמורות.
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

export function getPasswordResetEmailText(otp: string): string {
  return `
איפוס סיסמה - סדר

קיבלנו בקשה לאיפוס הסיסמה שלכם.

הקוד שלכם: ${otp}

הקוד יפוג תוך 5 דקות.

אם לא ביקשתם לאפס את הסיסמה, התעלמו מאימייל זה.
  `.trim();
}
