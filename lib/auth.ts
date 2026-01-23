import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import {
  sendEmail,
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
} from "./email";

export const auth = betterAuth({
  trustedOrigins: [
    "https://sedder.app",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
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
