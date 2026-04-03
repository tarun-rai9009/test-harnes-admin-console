import type { FieldValidationResult } from "@/lib/workflows/workflow-types";

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
 * Carrier code: trim, uppercase, alphanumeric + hyphen/underscore.
 * "Preferred" pattern — we normalize case rather than rejecting lowercase.
 */
export function validateCarrierCode(raw: unknown): FieldValidationResult {
  const s = trimString(raw);
  if (!s) {
    return { ok: false, error: "Please enter a carrier code." };
  }
  const upper = s.toUpperCase();
  if (!/^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/.test(upper)) {
    return {
      ok: false,
      error:
        "Use letters and numbers only (you may use hyphens or underscores between segments).",
    };
  }
  return { ok: true, normalized: upper };
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

const SKIP_TOKENS = new Set([
  "skip",
  "none",
  "no change",
  "unchanged",
  "-",
  "n/a",
  "na",
]);

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
      error: `For ${fieldLabel}, reply yes or no — or say skip if it doesn’t apply.`,
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
