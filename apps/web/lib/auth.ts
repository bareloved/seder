import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, emailOTP } from "better-auth/plugins";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import {
  sendEmail,
  sendWelcomeEmail,
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
  getVerificationEmailHtml,
  getVerificationEmailText,
} from "./email";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "build-placeholder-not-used-at-runtime",
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
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "אימות כתובת אימייל - סדר",
        html: getVerificationEmailHtml(url),
        text: getVerificationEmailText(url),
      });
    },
    async afterEmailVerification(user) {
      void sendWelcomeEmail(user.email, user.name);
    },
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
      // No extra scopes at sign-in (incremental authorization). The
      // calendar.readonly scope is requested separately via linkSocial when
      // the user explicitly connects their calendar.
      //
      // accessType offline + no prompt: Google issues a refresh token on the
      // first calendar grant via linkSocial. We deliberately do NOT set
      // prompt: "consent" because Better Auth hardcodes
      // include_granted_scopes=true, and the combination causes Google to
      // re-surface previously-granted sensitive scopes on every sign-in
      // consent screen — which triggers the "unverified app" warning even
      // when the current OAuth request only asks for basic profile scopes.
      accessType: "offline",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const defaults = [
            { name: "קטגוריה 1", color: "emerald", icon: "Circle", displayOrder: "1" },
            { name: "קטגוריה 2", color: "indigo", icon: "Circle", displayOrder: "2" },
            { name: "קטגוריה 3", color: "slate", icon: "Circle", displayOrder: "3" },
          ];

          await db.insert(schema.categories).values(
            defaults.map((cat) => ({
              userId: user.id,
              ...cat,
            }))
          );

          // Google OAuth users have emailVerified=true at creation — send welcome email immediately
          if (user.emailVerified) {
            void sendWelcomeEmail(user.email, user.name);
          }
        },
      },
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
