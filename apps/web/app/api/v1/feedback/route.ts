import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { message, platform } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new ValidationError("נא להזין הודעה");
    }

    if (message.length > 5000) {
      throw new ValidationError("ההודעה ארוכה מדי (עד 5000 תווים)");
    }

    // Escape HTML to prevent XSS in email
    const safeMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const safePlatform = String(platform || "web")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    await sendEmail({
      to:
        process.env.FEEDBACK_EMAIL ||
        process.env.EMAIL_FROM ||
        "noreply@sedder.app",
      subject: `משוב מ-Seder (${safePlatform})`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; padding: 24px;">
          <h3>משוב חדש</h3>
          <p><strong>משתמש:</strong> ${userId}</p>
          <p><strong>פלטפורמה:</strong> ${safePlatform}</p>
          <p><strong>הודעה:</strong></p>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 16px; border-radius: 8px;">${safeMessage}</p>
        </div>
      `,
      text: `משוב חדש\nמשתמש: ${userId}\nפלטפורמה: ${safePlatform}\nהודעה: ${message}`,
    });

    return apiSuccess({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}
