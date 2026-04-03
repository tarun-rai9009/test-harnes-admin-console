import type {
  AiIntentId,
  ExtractedFields,
  ExtractedScalar,
  IntentAnalysisResult,
} from "@/lib/ai/types";

const INTENTS: Set<AiIntentId> = new Set([
  "create_carrier_draft",
  "get_carrier_by_code",
  "get_all_carriers",
  "get_datapoints",
  "unknown",
]);

const CREATE_KEYS = new Set<string>([
  "carrierCode",
  "carrierName",
  "entityType",
  "organizationName",
  "organizationDba",
  "lineOfBusiness",
  "productTypes",
  "ultimateParentCompanyId",
  "parentCompanyId",
]);

const LOOKUP_KEYS = new Set<string>(["carrierCode"]);

/** When intent is unknown, still allow known carrier field keys only. */
const KEYS_FOR_UNKNOWN = new Set<string>([...CREATE_KEYS, ...LOOKUP_KEYS]);

function clampConfidence(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function normalizeProductTypes(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof value === "string") {
    const out = value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

function pickAllowedKeys(intent: AiIntentId): Set<string> | null {
  if (intent === "create_carrier_draft") return CREATE_KEYS;
  if (intent === "get_carrier_by_code") return LOOKUP_KEYS;
  if (intent === "get_all_carriers" || intent === "get_datapoints") {
    return null;
  }
  return KEYS_FOR_UNKNOWN;
}

function sanitizeExtractedForIntent(
  intent: AiIntentId,
  raw: unknown,
): ExtractedFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const allowed = pickAllowedKeys(intent);
  if (allowed === null) {
    return {};
  }

  const out: Record<string, ExtractedScalar> = {};
  const entries = Object.entries(raw as Record<string, unknown>);

  for (const [key, value] of entries) {
    if (!allowed.has(key)) continue;

    if (key === "productTypes") {
      const pts = normalizeProductTypes(value);
      if (pts) out.productTypes = pts;
      continue;
    }
    if (typeof value === "string") {
      const t = value.trim();
      if (t) out[key] = t;
    } else if (Array.isArray(value)) {
      const pts = normalizeProductTypes(value);
      if (pts) out[key] = pts;
    }
  }
  return out as ExtractedFields;
}

export function parseIntent(raw: unknown): AiIntentId {
  if (typeof raw !== "string") return "unknown";
  const s = raw.trim() as AiIntentId;
  return INTENTS.has(s) ? s : "unknown";
}

export function sanitizeAnalysis(raw: unknown): IntentAnalysisResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { intent: "unknown", extractedFields: {}, confidence: 0 };
  }
  const o = raw as Record<string, unknown>;
  const intent = parseIntent(o.intent);
  const extractedFields = sanitizeExtractedForIntent(
    intent,
    o.extractedFields,
  );
  return {
    intent,
    extractedFields,
    confidence: clampConfidence(o.confidence),
    naturalPreamble:
      typeof o.naturalPreamble === "string"
        ? o.naturalPreamble.trim() || undefined
        : undefined,
    suggestedFollowUp:
      typeof o.suggestedFollowUp === "string"
        ? o.suggestedFollowUp.trim() || undefined
        : undefined,
  };
}
