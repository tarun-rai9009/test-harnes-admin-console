import type { FieldValidationResult } from "@/lib/workflows/workflow-types";
import {
  ENTITY_TYPE_VALUES,
  LINE_OF_BUSINESS_VALUES,
  PRODUCT_TYPE_VALUES,
} from "@/types/zinnia/openapi-enums";

const SKIP_TOKENS = new Set([
  "skip",
  "none",
  "no change",
  "unchanged",
  "-",
  "n/a",
  "na",
]);

export function trimString(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length ? t : undefined;
}

/** Required non-empty string after trim. */
export function validateRequiredString(fieldLabel: string) {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s) {
      return {
        ok: false,
        error: `Please provide ${fieldLabel}.`,
      };
    }
    return { ok: true, normalized: s };
  };
}

/**
 * Carrier code per OpenAPI (`CarrierCodePath` + `CreateCarrierDraftRequest`):
 * exactly four uppercase alphanumeric characters.
 */
export function validateCarrierCode(raw: unknown): FieldValidationResult {
  const s = trimString(raw);
  if (!s) {
    return { ok: false, error: "Please enter a carrier code." };
  }
  const upper = s.toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(upper)) {
    return {
      ok: false,
      error:
        "Carrier code must be exactly 4 letters or numbers (for example A1B2).",
    };
  }
  return { ok: true, normalized: upper };
}

const PRODUCT_SET = new Set<string>(PRODUCT_TYPE_VALUES);

/** Exact match to OpenAPI EntityTypeEnum (display labels). */
export function validateEntityTypeOpenApi(raw: unknown): FieldValidationResult {
  const s = trimString(raw);
  if (!s) {
    return { ok: false, error: "Please choose an entity type." };
  }
  const exact = ENTITY_TYPE_VALUES.find((v) => v === s);
  if (exact) return { ok: true, normalized: exact };
  const ci = ENTITY_TYPE_VALUES.find(
    (v) => v.toLowerCase() === s.toLowerCase(),
  );
  if (ci) return { ok: true, normalized: ci };
    return {
      ok: false,
      error: `Use an allowed entity type (e.g. Corporation, LLC).`,
    };
}

/** 1–255 chars per OpenAPI string constraints on draft names. */
export function validateDraftNameString(fieldLabel: string, maxLen = 255) {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s) {
      return { ok: false, error: `Please provide ${fieldLabel}.` };
    }
    if (s.length > maxLen) {
      return {
        ok: false,
        error: `${fieldLabel} must be at most ${maxLen} characters.`,
      };
    }
    return { ok: true, normalized: s };
  };
}

/** Optional line of business — must match OpenAPI enum if provided. */
export function validateOptionalLineOfBusinessOpenApi() {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    const exact = LINE_OF_BUSINESS_VALUES.find((v) => v === s);
    if (exact) return { ok: true, normalized: exact };
    const ci = LINE_OF_BUSINESS_VALUES.find(
      (v) => v.toLowerCase() === s.toLowerCase(),
    );
    if (ci) return { ok: true, normalized: ci };
    return {
      ok: false,
      error: "LOB must match an allowed value (e.g. P&C). Say **skip** if N/A.",
    };
  };
}

/**
 * Optional product types — each value must match OpenAPI ProductTypeEnum if provided.
 */
export function validateOptionalProductTypesOpenApi() {
  return (raw: unknown): FieldValidationResult => {
    if (Array.isArray(raw)) {
      const out = raw
        .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
        .filter(Boolean);
      if (!out.length) return { ok: true, normalized: "" };
      for (const p of out) {
        if (!PRODUCT_SET.has(p)) {
          const ci = PRODUCT_TYPE_VALUES.find(
            (v) => v.toLowerCase() === p.toLowerCase(),
          );
          if (!ci) {
            return {
              ok: false,
              error: `Unknown product type “${p}”. Use allowed values or **skip**.`,
            };
          }
        }
      }
      const normalized = out.map((p) =>
        PRODUCT_TYPE_VALUES.find((v) => v.toLowerCase() === p.toLowerCase()) ??
        p,
      );
      return { ok: true, normalized };
    }
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    const parts = s.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return { ok: true, normalized: "" };
    const normalized: string[] = [];
    for (const p of parts) {
      const ci = PRODUCT_TYPE_VALUES.find(
        (v) => v.toLowerCase() === p.toLowerCase(),
      );
      if (!ci) {
        return {
          ok: false,
          error: `Unknown product type “${p}”. Use allowed values or **skip**.`,
        };
      }
      normalized.push(ci);
    }
    return { ok: true, normalized };
  };
}

/** Optional DBA — max 255, nullable in OpenAPI. */
export function validateOptionalOrganizationDbaOpenApi() {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    if (s.length > 255) {
      return {
        ok: false,
        error: "DBA must be at most 255 characters.",
      };
    }
    return { ok: true, normalized: s };
  };
}

/** Optional parent / ultimate parent id — plain trimmed string or skip. */
export function validateOptionalParentCompanyId(fieldLabel: string) {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    return { ok: true, normalized: s };
  };
}

/** Comma/semicolon-separated or JSON-like list → string[] */
export function validateProductTypes(raw: unknown): FieldValidationResult {
  if (Array.isArray(raw)) {
    const out = raw
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter(Boolean);
    if (!out.length) {
      return {
        ok: false,
        error: "Add at least one product type (comma-separated is fine).",
      };
    }
    return { ok: true, normalized: out };
  }
  const s = trimString(raw);
  if (!s) {
    return {
      ok: false,
      error: "List the product types, separated by commas.",
    };
  }
  const out = s
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!out.length) {
    return {
      ok: false,
      error: "Add at least one product type (comma-separated is fine).",
    };
  }
  return { ok: true, normalized: out };
}

/** Optional product list; skip tokens → omitted (empty string). */
export function validateOptionalProductTypes() {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    return validateProductTypes(raw);
  };
}

/** Optional string; skip tokens → empty (caller treats as omitted). */
export function validateOptionalString(fieldLabel: string) {
  return (raw: unknown): FieldValidationResult => {
    void fieldLabel;
    const s = trimString(raw);
    if (!s) {
      return { ok: true, normalized: "" };
    }
    if (SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    return { ok: true, normalized: s };
  };
}

/** Optional yes/no; skip → empty string (omitted); otherwise boolean. */
export function validateOptionalYesNo(fieldLabel: string) {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    const t = s.toLowerCase();
    if (/^(yes|y|yeah|true|1)\b/.test(t)) {
      return { ok: true, normalized: true };
    }
    if (/^(no|n|nope|false|0)\b/.test(t)) {
      return { ok: true, normalized: false };
    }
    return {
      ok: false,
      error: `${fieldLabel}: yes, no, or **skip**.`,
    };
  };
}

/** Optional year-like value; skip → "". */
export function validateOptionalYear(fieldLabel: string) {
  return (raw: unknown): FieldValidationResult => {
    const s = trimString(raw);
    if (!s || SKIP_TOKENS.has(s.toLowerCase())) {
      return { ok: true, normalized: "" };
    }
    if (!/^\d{4}$/.test(s)) {
      return {
        ok: false,
        error: `Please give a four-digit year for ${fieldLabel}, or say skip.`,
      };
    }
    return { ok: true, normalized: s };
  };
}
