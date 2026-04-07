import type { EnumSelectOption } from "@/lib/workflows/carrier-form-enum-ui";

const YN_LABELS: Record<string, string> = { Y: "Yes", N: "No" };

/**
 * Build select options from a datapoint inner map (apiValue → display label).
 * Uses the map **value** as the form/API string (matches OpenAPI JsonValue style).
 * Sorted by label for stable UI.
 */
export function referenceMapToOptions(
  inner: Record<string, string> | undefined,
  schemaHint?: "YnEnum",
): EnumSelectOption[] {
  if (!inner || typeof inner !== "object") return [];
  const out: EnumSelectOption[] = [];
  const seen = new Set<string>();
  for (const [, v] of Object.entries(inner)) {
    const value = String(v).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label =
      schemaHint === "YnEnum" ? (YN_LABELS[value] ?? value) : value;
    out.push({ value, label });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}
