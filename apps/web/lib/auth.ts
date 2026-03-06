import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, emailOTP } from "better-auth/plugins";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import {
  sendEmail,
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
} from "./email";

export const auth = betterAuth({
  trustedOrigins: (request) => {
    const origin = request.headers.get("origin");
    // Allow requests with no Origin header (native mobile apps)
    if (!origin) return true;
    const trusted = [
      "https://sedder.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ];
    return trusted.includes(origin);
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
      accessType: "offline",
      prompt: "consent", // Always request consent to ensure refresh token is provided
    },
  },
  plugins: [
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "forget-password") {
          await sendEmail({
            to: email,
            subject: "איפוס סיסמה - סדר",
            html: getPasswordResetEmailHtml(otp),
            text: getPasswordResetEmailText(otp),
          });
        }
      },
    }),
  ],
});
