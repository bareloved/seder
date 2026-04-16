import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  date,
  text,
  numeric,
  boolean,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  json,
  integer,
} from "drizzle-orm/pg-core";

// Invoice status enum values
export const invoiceStatusValues = ["draft", "sent", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatusValues)[number];

// Payment status enum values
export const paymentStatusValues = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

// --- AUTH SCHEMA ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Categories table - user-customizable income categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 30 }).notNull(),
  icon: varchar("icon", { length: 30 }).notNull(),
  displayOrder: numeric("display_order", { precision: 10, scale: 0 }).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("categories_user_id_idx").on(table.userId),
  userOrderIdx: index("categories_user_order_idx").on(table.userId, table.displayOrder),
  userNameUnique: uniqueIndex("categories_user_name_key").on(table.userId, table.name),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// Clients table - user's client directory with contact info and defaults
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  defaultRate: numeric("default_rate", { precision: 12, scale: 2 }),
  isArchived: boolean("is_archived").default(false).notNull(),
  displayOrder: numeric("display_order", { precision: 10, scale: 0 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("clients_user_id_idx").on(table.userId),
  userNameUnique: uniqueIndex("clients_user_name_key").on(table.userId, table.name),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

// Rolling jobs table - recurring income templates
export const rollingJobs = pgTable("rolling_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  amountGross: numeric("amount_gross", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("18").notNull(),
  includesVat: boolean("includes_vat").default(true).notNull(),
  defaultInvoiceStatus: varchar("default_invoice_status", { length: 20 })
    .$type<InvoiceStatus>()
    .default("draft")
    .notNull(),
  cadence: json("cadence").notNull(), // { kind: "daily"|"weekly"|"monthly", ... }
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  sourceCalendarRecurringEventId: varchar("source_calendar_recurring_event_id", { length: 255 }),
  sourceCalendarId: varchar("source_calendar_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("rolling_jobs_user_id_idx").on(table.userId),
  userActiveIdx: index("rolling_jobs_user_active_idx").on(table.userId, table.isActive),
  userCalendarRecurringIdx: index("rolling_jobs_user_cal_recurring_idx").on(
    table.userId,
    table.sourceCalendarRecurringEventId,
  ),
}));

export type RollingJobRow = typeof rollingJobs.$inferSelect;
export type NewRollingJobRow = typeof rollingJobs.$inferInsert;

// Income entries table
export const incomeEntries = pgTable("income_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  clientName: text("client_name").notNull(),
  amountGross: numeric("amount_gross", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0").notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("18").notNull(),
  includesVat: boolean("includes_vat").default(true).notNull(),
  invoiceStatus: varchar("invoice_status", { length: 20 })
    .$type<InvoiceStatus>()
    .default("draft")
    .notNull(),
  paymentStatus: varchar("payment_status", { length: 20 })
    .$type<PaymentStatus>()
    .default("unpaid")
    .notNull(),
  calendarEventId: varchar("calendar_event_id", { length: 255 }),
  notes: text("notes"),
  category: varchar("category", { length: 50 }), // Legacy - kept for migration
  categoryId: uuid("category_id").references(() => categories.id), // New FK
  clientId: uuid("client_id").references(() => clients.id), // FK to clients table
  rollingJobId: uuid("rolling_job_id").references(() => rollingJobs.id, { onDelete: "set null" }),
  detachedFromTemplate: boolean("detached_from_template").default(false).notNull(),
  invoiceSentDate: date("invoice_sent_date"),
  paidDate: date("paid_date"),
  // Enforce NOT NULL now that migration is complete
  userId: text("user_id").notNull().references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    dateIdx: index("date_idx").on(table.date),
    invoiceStatusIdx: index("invoice_status_idx").on(table.invoiceStatus),
    paymentStatusIdx: index("payment_status_idx").on(table.paymentStatus),
    clientNameIdx: index("client_name_idx").on(table.clientName),
    userIdIdx: index("user_id_idx").on(table.userId),
    userDateIdx: index("income_user_date_idx").on(table.userId, table.date),
    categoryIdIdx: index("income_category_id_idx").on(table.categoryId),
    clientIdIdx: index("income_client_id_idx").on(table.clientId),
    // Scope calendar event uniqueness per user to allow shared calendars
    calendarEventUnique: uniqueIndex("income_calendar_event_user_key").on(
      table.userId,
      table.calendarEventId
    ),
    rollingJobDateUnique: uniqueIndex("income_rolling_job_date_key").on(
      table.rollingJobId,
      table.date
    ),
  };
});

// User Settings table
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => user.id),
  language: varchar("language", { length: 10 }).default("he").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Jerusalem").notNull(),
  theme: varchar("theme", { length: 20 }).default("system").notNull(),
  dateFormat: varchar("date_format", { length: 20 }).default("dd/MM/yyyy").notNull(),
  defaultCurrency: varchar("default_currency", { length: 10 }).default("ILS").notNull(),
  calendarSettings: json("calendar_settings").$type<{
    rules?: any[];
    defaultCalendarId?: string;
    autoSyncEnabled?: boolean;
    lastAutoSync?: string;  // ISO timestamp
    selectedCalendarIds?: string[];  // Which calendars to sync
  }>().default({}),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  // Smart Nudges settings
  nudgeWeeklyDay: integer("nudge_weekly_day").default(5), // 0=Sun, 5=Fri
  nudgePushEnabled: json("nudge_push_enabled").$type<{
    overdue: boolean;
    day_after_gig: boolean;
    weekly_uninvoiced: boolean;
    calendar_sync: boolean;
    unpaid_check: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// TypeScript type for income entry
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type NewIncomeEntry = typeof incomeEntries.$inferInsert;

// Device tokens for push notifications (mobile app)
export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios' | 'android'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userTokenUnique: uniqueIndex("device_tokens_user_token_idx").on(table.userId, table.token),
}));

// Dismissed/snoozed nudges for the Smart Nudges system
export const dismissedNudges = pgTable("dismissed_nudges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").references(() => incomeEntries.id, { onDelete: "cascade" }),
  nudgeType: varchar("nudge_type", { length: 30 }).notNull(),
  periodKey: varchar("period_key", { length: 20 }),
  dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
  snoozeUntil: timestamp("snooze_until"),
  lastPushedAt: timestamp("last_pushed_at"),
}, (table) => ({
  userEntryTypeUnique: uniqueIndex("dismissed_nudges_user_entry_type_key")
    .on(table.userId, table.entryId, table.nudgeType),
  userTypePeriodUnique: uniqueIndex("dismissed_nudges_user_type_period_key")
    .on(table.userId, table.nudgeType, table.periodKey),
  userIdx: index("dismissed_nudges_user_idx").on(table.userId),
}));

export type DismissedNudge = typeof dismissedNudges.$inferSelect;

// Feedback table - user feedback stored for admin dashboard
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  category: varchar("category", { length: 20 }).default("general").notNull(),
  platform: varchar("platform", { length: 10 }).default("web").notNull(),
  status: varchar("status", { length: 15 }).$type<"unread" | "read" | "in_progress" | "done" | "replied">().default("unread").notNull(),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("feedback_user_idx").on(table.userId),
  statusIdx: index("feedback_status_idx").on(table.status),
  createdAtIdx: index("feedback_created_at_idx").on(table.createdAt),
}));

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

// Site-wide config (admin settings, feature flags)
export const siteConfig = pgTable("site_config", {
  key: varchar("key", { length: 50 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
