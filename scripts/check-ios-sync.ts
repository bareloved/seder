#!/usr/bin/env tsx
/**
 * iOS Sync Checker
 *
 * Reads the API contract JSON and compares it against iOS Swift model files.
 * Reports mismatches — does NOT auto-generate Swift code.
 *
 * Usage: pnpm sync:check-ios
 */

import * as fs from "fs";
import * as path from "path";

const CONTRACT_PATH = path.resolve(__dirname, "../docs/api-contract.json");
const IOS_MODELS_DIR = path.resolve(__dirname, "../apps/ios/Seder/Seder/Models");

// ── Swift parsing helpers ──

interface SwiftField {
  name: string;
  type: string;
  optional: boolean;
}

interface SwiftStruct {
  name: string;
  fields: SwiftField[];
}

interface SwiftEnum {
  name: string;
  cases: string[];
}

function parseSwiftFile(content: string): { structs: SwiftStruct[]; enums: SwiftEnum[] } {
  const structs: SwiftStruct[] = [];
  const enums: SwiftEnum[] = [];

  // Match struct definitions
  const structRegex = /(?:nonisolated\s+)?struct\s+(\w+)\s*:[^{]*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = structRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields: SwiftField[] = [];

    // Match let/var declarations (not computed properties)
    const fieldRegex = /(?:let|var)\s+(\w+)\s*:\s*([^\n=]+?)(?:\s*$|\s*\/\/)/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      let fieldType = fieldMatch[2].trim();
      const optional = fieldType.endsWith("?");
      if (optional) fieldType = fieldType.slice(0, -1);
      fields.push({ name: fieldName, type: fieldType, optional });
    }

    structs.push({ name, fields });
  }

  // Match enum definitions
  const enumRegex = /(?:nonisolated\s+)?enum\s+(\w+)\s*:\s*String[^{]*\{([\s\S]*?)^\}/gm;
  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const cases: string[] = [];

    // Match case declarations (single line only, no newlines)
    const caseRegex = /case\s+([a-zA-Z_][a-zA-Z_,\t ]*)/gm;
    let caseMatch;
    while ((caseMatch = caseRegex.exec(body)) !== null) {
      const caseLine = caseMatch[1].trim();
      // Handle comma-separated cases like "case draft, sent, paid, cancelled"
      for (const c of caseLine.split(",")) {
        const trimmed = c.trim();
        if (trimmed && /^[a-zA-Z_]+$/.test(trimmed)) {
          cases.push(trimmed);
        }
      }
    }

    enums.push({ name, cases });
  }

  return { structs, enums };
}

// ── TS → Swift type mapping ──

const TYPE_MAP: Record<string, string> = {
  "string": "String",
  "number": "String", // API returns Drizzle numeric as string
  "boolean": "Bool",
  "Date": "String",   // ISO 8601 string in API
  "string | null": "String",
  "number | string": "String",
  "number | string | null": "String",
  "InvoiceStatus": "InvoiceStatus",
  "PaymentStatus": "PaymentStatus",
  "Category | null": "CategoryData",
  "string[]": "[String]",
  "'work' | 'personal'": "String",
  "'title' | 'calendar'": "String",
  "number | null": "Double?",
};

function tsTypeToSwift(tsType: string): string {
  return TYPE_MAP[tsType] || tsType;
}

// ── Main ──

interface Mismatch {
  type: "missing_struct" | "missing_field" | "extra_field" | "type_mismatch" | "missing_enum" | "missing_case" | "extra_case" | "optionality_mismatch";
  context: string;
  expected?: string;
  actual?: string;
}

function main() {
  // Check contract exists
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error("API contract not found. Run `pnpm sync:contract` first.");
    process.exit(1);
  }

  // Check iOS models dir exists
  if (!fs.existsSync(IOS_MODELS_DIR)) {
    console.error(`iOS models directory not found at: ${IOS_MODELS_DIR}`);
    process.exit(1);
  }

  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf-8"));
  const mismatches: Mismatch[] = [];

  // Read all Swift files
  const swiftFiles = fs.readdirSync(IOS_MODELS_DIR).filter((f) => f.endsWith(".swift"));
  const allStructs: SwiftStruct[] = [];
  const allEnums: SwiftEnum[] = [];

  for (const file of swiftFiles) {
    const content = fs.readFileSync(path.join(IOS_MODELS_DIR, file), "utf-8");
    const parsed = parseSwiftFile(content);
    allStructs.push(...parsed.structs);
    allEnums.push(...parsed.enums);
  }

  const structMap = new Map(allStructs.map((s) => [s.name, s]));
  const enumMap = new Map(allEnums.map((e) => [e.name, e]));

  // Check interfaces
  for (const iface of contract.interfaces) {
    // Map TS interface names to Swift struct names
    const swiftName = iface.name === "ClassificationRule" ? "ClassificationRule" : iface.name;
    const swiftStruct = structMap.get(swiftName);

    if (!swiftStruct) {
      mismatches.push({
        type: "missing_struct",
        context: `Swift struct '${swiftName}' not found (maps to TS '${iface.name}')`,
      });
      continue;
    }

    const swiftFieldMap = new Map(swiftStruct.fields.map((f) => [f.name, f]));

    for (const field of iface.fields) {
      const swiftField = swiftFieldMap.get(field.name);
      if (!swiftField) {
        mismatches.push({
          type: "missing_field",
          context: `${swiftName}.${field.name}`,
          expected: `${tsTypeToSwift(field.type)}${field.optional ? "?" : ""}`,
        });
        continue;
      }

      // Check type compatibility (loose check)
      const expectedSwiftType = tsTypeToSwift(field.type);
      if (expectedSwiftType && swiftField.type !== expectedSwiftType &&
          swiftField.type !== `${expectedSwiftType}?` &&
          `${swiftField.type}?` !== expectedSwiftType) {
        // Skip known acceptable differences
        const acceptable =
          (field.type === "number" && swiftField.type === "Double") ||
          (field.type === "number" && swiftField.type === "Int") ||
          (field.type.includes("Date") && swiftField.type === "String");
        if (!acceptable) {
          mismatches.push({
            type: "type_mismatch",
            context: `${swiftName}.${field.name}`,
            expected: expectedSwiftType,
            actual: swiftField.type,
          });
        }
      }
    }
  }

  // Check enums
  for (const enumDef of contract.enums) {
    const swiftEnum = enumMap.get(enumDef.name);
    if (!swiftEnum) {
      // Not all TS string unions map to Swift enums — only report known ones
      if (["InvoiceStatus", "PaymentStatus"].includes(enumDef.name)) {
        mismatches.push({
          type: "missing_enum",
          context: `Swift enum '${enumDef.name}' not found`,
        });
      }
      continue;
    }

    // Check cases
    for (const value of enumDef.values) {
      if (!swiftEnum.cases.includes(value)) {
        mismatches.push({
          type: "missing_case",
          context: `${enumDef.name}.${value}`,
          expected: value,
        });
      }
    }

    for (const swiftCase of swiftEnum.cases) {
      if (!enumDef.values.includes(swiftCase)) {
        mismatches.push({
          type: "extra_case",
          context: `${enumDef.name}.${swiftCase}`,
          actual: swiftCase,
        });
      }
    }
  }

  // Output report
  console.log("=== iOS Sync Check Report ===");
  console.log(`Contract generated: ${contract.generatedAt}`);
  console.log(`Swift models dir: ${IOS_MODELS_DIR}`);
  console.log(`Swift files scanned: ${swiftFiles.join(", ")}`);
  console.log(`Structs found: ${allStructs.map((s) => s.name).join(", ")}`);
  console.log(`Enums found: ${allEnums.map((e) => e.name).join(", ")}`);
  console.log("");

  if (mismatches.length === 0) {
    console.log("All sync checks passed! iOS models match the API contract.");
  } else {
    console.log(`Found ${mismatches.length} mismatch(es):\n`);
    for (const m of mismatches) {
      const icon = m.type === "missing_struct" || m.type === "missing_enum" ? "!!!" :
                   m.type === "missing_field" || m.type === "missing_case" ? " + " :
                   m.type === "extra_field" || m.type === "extra_case" ? " - " : " ~ ";
      let msg = `[${icon}] ${m.type}: ${m.context}`;
      if (m.expected) msg += ` (expected: ${m.expected})`;
      if (m.actual) msg += ` (actual: ${m.actual})`;
      console.log(msg);
    }
  }

  process.exit(mismatches.length > 0 ? 1 : 0);
}

main();
