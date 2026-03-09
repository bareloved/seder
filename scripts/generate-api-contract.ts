#!/usr/bin/env tsx
/**
 * API Contract Generator
 *
 * Reads @seder/shared exports and generates a JSON reference file
 * that serves as the single source of truth for iOS/Swift development.
 *
 * Usage: pnpm sync:contract
 */

import * as shared from "../packages/shared/src/index";
import * as fs from "fs";
import * as path from "path";

interface TypeField {
  name: string;
  type: string;
  optional: boolean;
}

interface ContractInterface {
  name: string;
  fields: TypeField[];
}

interface ContractEnum {
  name: string;
  values: string[];
}

interface ContractConstant {
  name: string;
  value: unknown;
}

interface ContractFunction {
  name: string;
  description: string;
}

interface ApiContract {
  generatedAt: string;
  version: string;
  interfaces: ContractInterface[];
  enums: ContractEnum[];
  constants: ContractConstant[];
  functions: ContractFunction[];
}

// ── Interface definitions (manually listed since TS reflection is limited) ──

const interfaces: ContractInterface[] = [
  {
    name: "IncomeEntry",
    fields: [
      { name: "id", type: "string", optional: false },
      { name: "date", type: "string", optional: false },
      { name: "description", type: "string", optional: false },
      { name: "clientName", type: "string", optional: false },
      { name: "clientId", type: "string | null", optional: true },
      { name: "userId", type: "string", optional: true },
      { name: "amountGross", type: "number", optional: false },
      { name: "amountPaid", type: "number", optional: false },
      { name: "vatRate", type: "number", optional: false },
      { name: "includesVat", type: "boolean", optional: false },
      { name: "invoiceStatus", type: "InvoiceStatus", optional: false },
      { name: "paymentStatus", type: "PaymentStatus", optional: false },
      { name: "category", type: "string | null", optional: true },
      { name: "categoryId", type: "string | null", optional: true },
      { name: "categoryData", type: "Category | null", optional: true },
      { name: "notes", type: "string | null", optional: true },
      { name: "invoiceSentDate", type: "string | null", optional: true },
      { name: "paidDate", type: "string | null", optional: true },
      { name: "calendarEventId", type: "string | null", optional: true },
      { name: "createdAt", type: "Date", optional: true },
      { name: "updatedAt", type: "Date", optional: true },
    ],
  },
  {
    name: "Category",
    fields: [
      { name: "id", type: "string", optional: false },
      { name: "userId", type: "string", optional: false },
      { name: "name", type: "string", optional: false },
      { name: "color", type: "string", optional: false },
      { name: "icon", type: "string", optional: false },
      { name: "displayOrder", type: "number | string", optional: false },
      { name: "isArchived", type: "boolean", optional: false },
      { name: "createdAt", type: "Date", optional: false },
      { name: "updatedAt", type: "Date", optional: false },
    ],
  },
  {
    name: "Client",
    fields: [
      { name: "id", type: "string", optional: false },
      { name: "userId", type: "string", optional: false },
      { name: "name", type: "string", optional: false },
      { name: "email", type: "string | null", optional: true },
      { name: "phone", type: "string | null", optional: true },
      { name: "notes", type: "string | null", optional: true },
      { name: "defaultRate", type: "number | string | null", optional: true },
      { name: "isArchived", type: "boolean", optional: false },
      { name: "displayOrder", type: "number | string | null", optional: true },
      { name: "createdAt", type: "Date", optional: false },
      { name: "updatedAt", type: "Date", optional: false },
    ],
  },
  {
    name: "ClientWithAnalytics",
    fields: [
      { name: "totalEarned", type: "number", optional: false },
      { name: "thisMonthRevenue", type: "number", optional: false },
      { name: "thisYearRevenue", type: "number", optional: false },
      { name: "averagePerJob", type: "number", optional: false },
      { name: "jobCount", type: "number", optional: false },
      { name: "outstandingAmount", type: "number", optional: false },
      { name: "avgDaysToPayment", type: "number | null", optional: false },
      { name: "overdueInvoices", type: "number", optional: false },
    ],
  },
  {
    name: "KPIData",
    fields: [
      { name: "outstanding", type: "number", optional: false },
      { name: "readyToInvoice", type: "number", optional: false },
      { name: "readyToInvoiceCount", type: "number", optional: false },
      { name: "thisMonth", type: "number", optional: false },
      { name: "thisMonthCount", type: "number", optional: false },
      { name: "trend", type: "number", optional: false },
      { name: "totalPaid", type: "number", optional: false },
      { name: "overdueCount", type: "number", optional: false },
      { name: "invoicedCount", type: "number", optional: false },
    ],
  },
  {
    name: "ClassificationRule",
    fields: [
      { name: "id", type: "string", optional: false },
      { name: "type", type: "'work' | 'personal'", optional: false },
      { name: "matchType", type: "'title' | 'calendar'", optional: false },
      { name: "keywords", type: "string[]", optional: false },
      { name: "enabled", type: "boolean", optional: false },
    ],
  },
  {
    name: "RuleClassificationResult",
    fields: [
      { name: "eventId", type: "string", optional: false },
      { name: "isWork", type: "boolean", optional: false },
      { name: "confidence", type: "number", optional: false },
      { name: "matchedRule", type: "string", optional: true },
      { name: "matchedKeyword", type: "string", optional: true },
    ],
  },
];

// ── Enums (string unions) ──

const enums: ContractEnum[] = [
  { name: "InvoiceStatus", values: [...shared.invoiceStatusValues] },
  { name: "PaymentStatus", values: [...shared.paymentStatusValues] },
  { name: "DisplayStatus", values: ["בוצע", "נשלחה", "שולם"] },
  { name: "VatType", values: ["חייב מע״מ", "ללא מע״מ", "כולל מע״מ"] },
  { name: "FilterType", values: ["all", "ready-to-invoice", "invoiced", "paid", "overdue"] },
  { name: "WorkStatus", values: ["in_progress", "done"] },
  { name: "MoneyStatus", values: ["no_invoice", "invoice_sent", "paid"] },
  { name: "CategoryColor", values: [...shared.categoryColors] },
  { name: "CategoryIcon", values: [...shared.categoryIcons] },
];

// ── Constants ──

const constants: ContractConstant[] = [
  { name: "DEFAULT_VAT_RATE", value: shared.DEFAULT_VAT_RATE },
  { name: "DEFAULT_CATEGORIES", value: shared.DEFAULT_CATEGORIES },
  { name: "STATUS_CONFIG", value: shared.STATUS_CONFIG },
  { name: "WORK_STATUS_CONFIG", value: shared.WORK_STATUS_CONFIG },
  { name: "MONEY_STATUS_CONFIG", value: shared.MONEY_STATUS_CONFIG },
  { name: "MONTH_NAMES", value: shared.MONTH_NAMES },
  { name: "DEFAULT_RULES", value: shared.DEFAULT_RULES },
  { name: "DISPLAY_STATUSES", value: shared.DISPLAY_STATUSES },
  { name: "categoryColors", value: [...shared.categoryColors] },
  { name: "categoryIcons", value: [...shared.categoryIcons] },
];

// ── Functions ──

const functions: ContractFunction[] = [
  { name: "Currency.add", description: "Add two numbers with 2-decimal precision" },
  { name: "Currency.subtract", description: "Subtract two numbers with 2-decimal precision" },
  { name: "Currency.multiply", description: "Multiply two numbers with 2-decimal precision" },
  { name: "Currency.divide", description: "Divide two numbers with 2-decimal precision" },
  { name: "Currency.fromString", description: "Parse string to 2-decimal number" },
  { name: "getTodayDateString", description: "Get today as YYYY-MM-DD string" },
  { name: "isPastDate", description: "Check if date string is before today" },
  { name: "daysSince", description: "Days elapsed since a date string" },
  { name: "getMonthYear", description: "Extract {month, year} from date string" },
  { name: "isOverdue", description: "Check if invoice sent > N days ago and not paid" },
  { name: "getDisplayStatus", description: "Get Hebrew display status from entry" },
  { name: "getWorkStatus", description: "Get work status (in_progress/done) from entry date" },
  { name: "getMoneyStatus", description: "Get money status from invoice/payment status" },
  { name: "displayStatusToDb", description: "Convert Hebrew display status to DB fields" },
  { name: "dbStatusToDisplay", description: "Convert DB fields to Hebrew display status" },
  { name: "mapStatusToDb", description: "Map display status to DB invoiceStatus/paymentStatus" },
  { name: "mapMoneyStatusToDb", description: "Map money status to DB fields" },
  { name: "mapVatTypeToDb", description: "Map VAT type to DB vatRate/includesVat" },
  { name: "getVatTypeFromEntry", description: "Get VAT type label from entry fields" },
  { name: "filterByMonth", description: "Filter entries array by month and year" },
  { name: "calculateKPIs", description: "Calculate KPI dashboard data from entries" },
  { name: "classifyByRules", description: "Classify calendar events as work/personal" },
  { name: "getKeywordVariations", description: "Get keyword + translation variations for matching" },
];

// ── Generate ──

const contract: ApiContract = {
  generatedAt: new Date().toISOString(),
  version: "1.0.0",
  interfaces,
  enums,
  constants,
  functions,
};

const outputPath = path.resolve(__dirname, "../docs/api-contract.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2) + "\n");

console.log(`API contract generated at: ${outputPath}`);
console.log(`  ${interfaces.length} interfaces`);
console.log(`  ${enums.length} enums`);
console.log(`  ${constants.length} constants`);
console.log(`  ${functions.length} functions`);
