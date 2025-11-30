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
} from "drizzle-orm/pg-core";

// Invoice status enum values
export const invoiceStatusValues = ["draft", "sent", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatusValues)[number];

// Payment status enum values
export const paymentStatusValues = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

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
  category: varchar("category", { length: 50 }),
  invoiceSentDate: date("invoice_sent_date"),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    dateIdx: index("date_idx").on(table.date),
    invoiceStatusIdx: index("invoice_status_idx").on(table.invoiceStatus),
    paymentStatusIdx: index("payment_status_idx").on(table.paymentStatus),
    clientNameIdx: index("client_name_idx").on(table.clientName),
    // Unique index on calendarEventId to prevent duplicate imports
    // NULL values are allowed (manual entries), only non-null values must be unique
    calendarEventUnique: uniqueIndex("income_calendar_event_id_key").on(table.calendarEventId),
  };
});

// TypeScript type for income entry
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type NewIncomeEntry = typeof incomeEntries.$inferInsert;
