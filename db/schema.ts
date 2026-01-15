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
    // Scope calendar event uniqueness per user to allow shared calendars
    calendarEventUnique: uniqueIndex("income_calendar_event_user_key").on(
      table.userId,
      table.calendarEventId
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
  calendarSettings: json("calendar_settings").$type<{ rules?: any[]; defaultCalendarId?: string }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// TypeScript type for income entry
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type NewIncomeEntry = typeof incomeEntries.$inferInsert;
