import "server-only";

import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { ZinniaApiError, ZinniaAuthError } from "@/lib/zinnia/types";

/** Maps common API field paths/keys to calm, business-facing phrases. */
const FIELD_LABEL_PHRASES: Record<string, string> = {
  carrierId: "carrier record ID",
  carrierCode: "carrier code",
  secondaryCarrierCode: "secondary carrier code",
  entityType: "entity type",
  carrierName: "carrier name",
  lineOfBusiness: "line of business",
  productTypes: "product types",
  ultimateParentCompanyId: "ultimate parent company ID",
  parentCompanyId: "parent company ID",
  organizationName: "organization name",
  organizationDba: "DBA name",
  organizationShortName: "organization short name",
  logoAssetReference: "logo reference",
  organizationDomainName: "organization website or domain",
  carrierLoginUrl: "carrier login URL",
  agentLoginUrl: "agent login URL",
  customerLoginUrl: "customer login URL",
  identifierType: "identifier type",
  identifierValue: "identifier value",
  foundedYear: "year founded",
  authorizedJurisdictionStates: "authorized states or jurisdictions",
  rating: "rating",
  tpaNonTpa: "TPA information",
  isC2CRplParticipant: "C2C RPL participation",
  use1035YP: "1035 YP flag",
  addressLine1: "address",
  addressZipCode: "ZIP or postal code",
  emailAddress: "email address",
  dialNumber: "phone number",
  participantId: "participant ID",
  locationId: "location ID",
};

function normalizeFieldKey(raw: string): string {
  const parts = raw
    .replace(/^\$\.?/, "")
    .replace(/\[\d+\]/g, "")
    .split(".");
  const leaf = (parts.pop() ?? raw).replace(/[[\]"']/g, "").trim();
  return leaf.length ? leaf : raw.trim();
}

function labelForFieldKey(key: string): string {
  const leaf = normalizeFieldKey(key);
  const direct = FIELD_LABEL_PHRASES[leaf];
  if (direct) return direct;
  const spaced = leaf
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
  return spaced.length ? spaced : "a required value";
}

function collectFieldKeysFromUnknown(obj: unknown, out: Set<string>): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectFieldKeysFromUnknown(item, out);
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === "field" && typeof v === "string") out.add(v);
    else if (k === "fields" && Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string") out.add(x);
        else if (x && typeof x === "object" && "field" in x && typeof (x as { field: unknown }).field === "string") {
          out.add((x as { field: string }).field);
        }
      }
    } else if (
      (k === "errors" || k === "validationErrors" || k === "details") &&
      typeof v === "object" &&
      v !== null &&
      !Array.isArray(v)
    ) {
      for (const fk of Object.keys(v as object)) out.add(fk);
    } else if (typeof v === "object" && v !== null) {
      collectFieldKeysFromUnknown(v, out);
    }
  }
}

function parseProblemFieldKeys(bodyText: string): string[] {
  const keys = new Set<string>();
  const trimmed = bodyText.trim();
  if (!trimmed) return [];

  try {
    const j = JSON.parse(trimmed) as unknown;
    if (Array.isArray(j)) {
      for (const item of j) {
        if (
          item &&
          typeof item === "object" &&
          "field" in item &&
          typeof (item as { field: unknown }).field === "string"
        ) {
          keys.add((item as { field: string }).field);
        }
      }
    }
    collectFieldKeysFromUnknown(j, keys);
    if (typeof j === "object" && j !== null && "message" in j) {
      const m = (j as { message: unknown }).message;
      if (typeof m === "string") {
        for (const token of m.split(/[,;]+/)) {
          const t = token.trim();
          if (/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(t) && t.length < 80) keys.add(t);
        }
      }
    }
  } catch {
    const lower = trimmed.toLowerCase();
    for (const k of Object.keys(FIELD_LABEL_PHRASES)) {
      if (lower.includes(k.toLowerCase())) keys.add(k);
    }
  }

  return [...keys];
}

function carrierCodeFromCarriersPath(path: string): string | undefined {
  const m = path.match(/^\/carriers\/([^/?]+)$/);
  if (!m) return undefined;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return m[1];
  }
}

function isSingleCarrierPath(path: string): boolean {
  return /^\/carriers\/[^/]+$/.test(path);
}

/**
 * Logs full technical detail server-side only (never send to the client).
 */
export function logWorkflowErrorServerSide(
  error: unknown,
  context: {
    workflowId?: string | null;
    workflowLabel?: string | null;
  },
): void {
  const base = {
    workflowId: context.workflowId ?? null,
    workflowLabel: context.workflowLabel ?? null,
  };

  if (error instanceof ZinniaApiError) {
    console.error("[zinnia-api]", {
      ...base,
      name: error.name,
      message: error.message,
      status: error.status,
      method: error.method,
      path: error.path,
      url: error.url ?? null,
      bodySnippet: error.bodyText.slice(0, 8_000),
    });
    if (error.stack) console.error(error.stack);
    return;
  }

  if (error instanceof ZinniaAuthError) {
    console.error("[zinnia-auth]", {
      ...base,
      name: error.name,
      message: error.message,
      status: error.status,
      tokenUrl: error.tokenUrl ?? null,
      bodySnippet: error.bodyText.slice(0, 4_000),
    });
    if (error.stack) console.error(error.stack);
    return;
  }

  if (error instanceof Error) {
    console.error("[chat-workflow]", {
      ...base,
      name: error.name,
      message: error.message,
    });
    if (error.stack) console.error(error.stack);
    return;
  }

  console.error("[chat-workflow]", { ...base, error: String(error) });
}

function messageForCreateValidation(e: ZinniaApiError): string {
  const keys = parseProblemFieldKeys(e.bodyText);
  const phrases = keys.length
    ? [...new Set(keys.map(labelForFieldKey))]
    : [];

  if (phrases.length === 1) {
    return `I could not create the carrier because ${phrases[0]!} appears to be invalid or was not accepted. Please correct it and try again.`;
  }
  if (phrases.length > 1) {
    const list = phrases.slice(0, 5).join(", ");
    const extra = phrases.length > 5 ? ", and a few other fields" : "";
    return `I could not create the carrier because some information was not accepted (${list}${extra}). Please review those items and try again.`;
  }

  if (e.status === 400 || e.status === 422) {
    return "I could not create the carrier because some information was missing or not accepted. Please review the details and try again.";
  }

  return "Something went wrong while creating the carrier. Please try again in a moment.";
}

function messageForUpdateValidation(e: ZinniaApiError): string {
  const keys = parseProblemFieldKeys(e.bodyText);
  const phrases = keys.length
    ? [...new Set(keys.map(labelForFieldKey))]
    : [];

  if (phrases.length === 1) {
    return `I could not save those changes because ${phrases[0]!} appears to be invalid or was not accepted. Please correct it and try again.`;
  }
  if (phrases.length > 1) {
    const list = phrases.slice(0, 5).join(", ");
    return `I could not save those changes because some fields were not accepted (${list}). Please review and try again.`;
  }

  if (e.status === 400 || e.status === 422) {
    return "I could not save those changes because some information was missing or not accepted. Please review and try again.";
  }

  return "Something went wrong while saving your changes. Please try again in a moment.";
}

function messageForFindNotFound(e: ZinniaApiError, collected?: Record<string, unknown>): string {
  const fromPath = carrierCodeFromCarriersPath(e.path);
  const fromData =
    typeof collected?.carrierCode === "string"
      ? collected.carrierCode.trim().toUpperCase()
      : undefined;
  if (fromPath) {
    return `I could not find a carrier with code ${fromPath.toUpperCase()}. Please check the code and try again.`;
  }
  if (fromData) {
    return `I could not find a carrier with code ${fromData}. Please check the code and try again.`;
  }
  return "I could not find a carrier with that code. Please check the code and try again.";
}

function messageForZinniaApi(
  e: ZinniaApiError,
  workflowId: string | undefined,
  collected?: Record<string, unknown>,
): string {
  const { status, path, method } = e;

  if (status === 0) {
    return "Could not reach the carrier system (network or timeout). Check connectivity and configuration, then try again.";
  }

  if (status === 404 && method === "GET" && isSingleCarrierPath(path)) {
    return messageForFindNotFound(e, collected);
  }

  if (status === 404 && method === "PUT" && isSingleCarrierPath(path)) {
    const p = carrierCodeFromCarriersPath(path);
    const d =
      typeof collected?.carrierCode === "string"
        ? collected.carrierCode.trim().toUpperCase()
        : undefined;
    if (p || d) {
      const code = (p ?? d)!.toUpperCase();
      return `I could not find a carrier with code ${code} to update. Please verify the code.`;
    }
    return "I could not find that carrier to update. Please verify the code.";
  }

  if (
    workflowId === "create_carrier_draft" &&
    path.includes("/carriers/draft") &&
    (status === 400 || status === 422)
  ) {
    return messageForCreateValidation(e);
  }

  if (
    workflowId === "update_carrier" &&
    path.includes("/carriers/") &&
    (status === 400 || status === 422)
  ) {
    return messageForUpdateValidation(e);
  }

  if (status === 401 || status === 403) {
    return "You do not have permission to complete this action in the carrier system, or the session could not be verified. If this keeps happening, please contact your administrator.";
  }

  if (status === 429) {
    return "The carrier system is busy right now. Please wait a moment and try again.";
  }

  if (path === "/carriers" && method === "GET") {
    return "Something went wrong while retrieving carriers. Please try again.";
  }

  if (path === "/datapoints" || path.startsWith("/datapoints")) {
    return "Something went wrong while loading the reference list. Please try again.";
  }

  if (path.includes("/carriers/draft") && method === "POST") {
    return messageForCreateValidation(e);
  }

  if (method === "PUT" && isSingleCarrierPath(path)) {
    return messageForUpdateValidation(e);
  }

  if (method === "GET" && isSingleCarrierPath(path)) {
    if (status >= 500) {
      return "Something went wrong while looking up that carrier. Please try again.";
    }
    return messageForFindNotFound(e, collected);
  }

  if (status >= 500) {
    return "Something went wrong on the carrier system. Please try again in a moment.";
  }

  return "Something went wrong while talking to the carrier system. Please try again in a moment.";
}

function messageForAuth(): string {
  return "We could not sign in to the carrier system. Please check that the connection is configured correctly, then try again.";
}

/**
 * Calm, concise copy for chat. Never includes stack traces or raw API payloads.
 */
export function formatChatWorkflowError(
  error: unknown,
  def: WorkflowDefinition | undefined,
  collectedParams?: Record<string, unknown>,
): string {
  logWorkflowErrorServerSide(error, {
    workflowId: def?.id ?? null,
    workflowLabel: def?.userFacingLabel ?? null,
  });

  if (error instanceof ZinniaApiError) {
    return messageForZinniaApi(error, def?.id, collectedParams);
  }

  if (error instanceof ZinniaAuthError) {
    return messageForAuth();
  }

  if (error instanceof Error) {
    const m = error.message;
    if (/no update fields were provided/i.test(m)) {
      return "I could not send an update because no changes were included. Please add at least one value to update, then try again.";
    }
    if (/zinnia is not configured/i.test(m) || /not configured/i.test(m)) {
      return "The carrier system is not connected in this environment, so I can’t complete that yet.";
    }
    return "Something unexpected happened. Please try again in a moment.";
  }

  return "Something unexpected happened. Please try again in a moment.";
}
