import type { IntentAnalysisResult } from "@/lib/ai/types";
import { sanitizeAnalysis } from "@/lib/ai/sanitize";

const CREATE_RE =
  /\b(create|add|set\s*up|start|register|new)\b[\s\S]{0,40}\bcarrier\b|\bcarrier\b[\s\S]{0,40}\b(new|create|add)\b|help\s+me\s+create\s+a\s+carrier|want\s+to\s+create\s+a\s+(new\s+)?carrier/i;

const LOOKUP_RE =
  /\b(find|look\s*up|lookup|search|get|show|pull\s*up|need\s+to\s+look\s*up)\b[\s\S]{0,50}\bcarrier\b|\bcarrier\b[\s\S]{0,40}\b(find|look\s*up|lookup)\b/i;

const LIST_RE =
  /\b(show|list|get|see|display)\b[\s\S]{0,30}\b(all\s+)?carriers\b|\ball\s+carriers\b|\bcarriers\b[\s\S]{0,20}\bon\s+file\b/i;

const DATA_RE =
  /\b(datapoint|data\s*points|reference\s*data)\b/i;

function extractCarrierCode(text: string): string | undefined {
  const patterns = [
    /\bcarrier\s+code\s+([A-Za-z0-9][A-Za-z0-9_-]*)\b/i,
    /\bcode\s+([A-Za-z0-9][A-Za-z0-9_-]*)\b/i,
    /\bcarrier\s+([A-Za-z0-9][A-Za-z0-9_-]{2,})\b/i,
    /\b([A-Z]{1,3}\d{2,}[A-Z0-9]*)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      return m[1].toUpperCase();
    }
  }
  return undefined;
}

function extractAfterLabel(text: string, label: string): string | undefined {
  const re = new RegExp(
    `\\b${label}\\s*(?:is|:)?\\s*([^,]+?)(?=\\s*,\\s*\\w+\\s+(?:is|:)|$)`,
    "i",
  );
  const m = text.match(re);
  return m?.[1]?.trim();
}

function extractCreateFields(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const code =
    extractCarrierCode(text) ??
    extractAfterLabel(text, "code")?.replace(/^code\s+/i, "").trim();
  if (code) {
    const normalized = code.toUpperCase();
    if (/^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/.test(normalized)) {
      out.carrierCode = normalized;
    }
  }

  const nameMatch =
    text.match(
      /\bname\s+(?:is\s+)?([^,]+?)(?=\s*,\s*(?:entity|organization|code|line)\b|$)/i,
    ) ||
    text.match(
      /\bcarrier\s+name\s+(?:is\s+)?([^,]+?)(?=\s*,|\s+entity|\s+code|$)/i,
    );
  if (nameMatch?.[1]) {
    const n = nameMatch[1].trim();
    if (n.length > 1) out.carrierName = n;
  }

  const entityMatch = text.match(
    /\bentity\s+type\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (entityMatch?.[1]) out.entityType = entityMatch[1].trim();

  const orgMatch = text.match(
    /\borganization\s+name\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (orgMatch?.[1]) out.organizationName = orgMatch[1].trim();

  const dbaMatch = text.match(/\bDBA\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i);
  if (dbaMatch?.[1]) out.organizationDba = dbaMatch[1].trim();

  const lobMatch = text.match(
    /\bline\s+of\s+business\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (lobMatch?.[1]) out.lineOfBusiness = lobMatch[1].trim();

  const ptMatch = text.match(
    /\bproduct\s+types?\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (ptMatch?.[1]) {
    const parts = ptMatch[1]
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) out.productTypes = parts;
  }

  const ultMatch = text.match(
    /\bultimate\s+parent\s+company\s+id\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (ultMatch?.[1]) out.ultimateParentCompanyId = ultMatch[1].trim();

  const parMatch = text.match(
    /\bparent\s+company\s+id\s+(?:is\s+)?([^,]+?)(?=\s*,|$)/i,
  );
  if (parMatch?.[1]) out.parentCompanyId = parMatch[1].trim();

  return out;
}

function scoreIntent(
  text: string,
): { intent: IntentAnalysisResult["intent"]; confidence: number } {
  const t = text.trim();
  if (!t) return { intent: "unknown", confidence: 0.2 };

  const createHit = CREATE_RE.test(t);
  const lookupHit = LOOKUP_RE.test(t);
  const listHit = LIST_RE.test(t);
  const dataHit = DATA_RE.test(t);

  const codePresent = !!extractCarrierCode(t);

  if (createHit && !lookupHit) {
    return { intent: "create_carrier_draft", confidence: codePresent ? 0.82 : 0.72 };
  }
  if (lookupHit || (codePresent && /\bcarrier\b/i.test(t))) {
    return { intent: "get_carrier_by_code", confidence: codePresent ? 0.8 : 0.55 };
  }
  if (listHit) {
    return { intent: "get_all_carriers", confidence: 0.78 };
  }
  if (dataHit) {
    return { intent: "get_datapoints", confidence: 0.78 };
  }
  if (createHit && lookupHit) {
    return { intent: "unknown", confidence: 0.35 };
  }
  return { intent: "unknown", confidence: 0.25 };
}

/**
 * Rule-based intent + extraction when OpenAI is unavailable.
 */
export function analyzeWithHeuristics(
  userText: string,
): IntentAnalysisResult {
  const text = userText.trim();
  const { intent, confidence } = scoreIntent(text);
  const extracted =
    intent === "create_carrier_draft"
      ? extractCreateFields(text)
      : intent === "get_carrier_by_code"
        ? (() => {
            const code = extractCarrierCode(text);
            return code ? { carrierCode: code } : {};
          })()
        : {};

  return sanitizeAnalysis({
    intent,
    extractedFields: extracted,
    confidence,
  });
}
