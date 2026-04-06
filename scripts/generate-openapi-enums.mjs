/**
 * Extracts every `components.schemas.*` entry with an `enum` array from openapi.yaml
 * and writes types/zinnia/generated/openapi-enums.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const yamlPath = path.join(root, "openapi.yaml");
const outPath = path.join(root, "types/zinnia/generated/openapi-enums.ts");

const spec = yaml.parse(fs.readFileSync(yamlPath, "utf8"));
const schemas = spec.components?.schemas ?? {};

/** @type {Record<string, unknown[]>} */
const enums = {};
for (const [name, def] of Object.entries(schemas)) {
  if (def && typeof def === "object" && Array.isArray(def.enum)) {
    enums[name] = def.enum;
  }
}

const sortedNames = Object.keys(enums).sort();
const lines = [
  "/**",
  " * AUTO-GENERATED from openapi.yaml — do not edit by hand.",
  " * Regenerate: `npm run generate:openapi-enums`",
  " */",
  "",
  "export const OPENAPI_ENUMS = {",
];

for (const name of sortedNames) {
  const values = enums[name];
  const json = JSON.stringify(values, null, 2);
  const indented = json
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");
  lines.push(`  ${name}: ${indented} as const,`);
}
lines.push("} as const;");
lines.push("");
lines.push("export type OpenApiEnumSchemaName = keyof typeof OPENAPI_ENUMS;");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outPath)} (${sortedNames.length} enum schemas).`);
