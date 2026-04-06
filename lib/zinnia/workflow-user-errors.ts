import "server-only";

import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { extractZinniaValidationIssuesFromBody } from "@/lib/zinnia/parse-zinnia-validation-body";
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
    console.error("[workflow]", {
      ...base,
      name: error.name,
      message: error.message,
    });
    if (error.stack) console.error(error.stack);
    return;
  }

  console.error("[workflow]", { ...base, error: String(error) });
}

function messageForCreateValidation(e: ZinniaApiError): string {
  const issues = extractZinniaValidationIssuesFromBody(e.bodyText);
  if (issues.length === 1) {
    return `${issues[0]} Please adjust and try again.`;
  }
  if (issues.length > 1) {
    return `${issues.slice(0, 4).join(" · ")} Please adjust and try again.`;
  }

  const keys = parseProblemFieldKeys(e.bodyText);
  const phrases = keys.length
    ? [...new Set(keys.map(labelForFieldKey))]
    : [];

  if (phrases.length === 1) {
    return `Fix ${phrases[0]!} and try again.`;
  }
  if (phrases.length > 1) {
    const list = phrases.slice(0, 5).join(", ");
    const extra = phrases.length > 5 ? ", …" : "";
    return `Fix: ${list}${extra}. Then try again.`;
  }

  if (e.status === 400 || e.status === 422) {
    return "Create failed — check the details and try again.";
  }

  return "Couldn’t create the carrier. Try again.";
}

function messageForUpdateValidation(e: ZinniaApiError): string {
  const issues = extractZinniaValidationIssuesFromBody(e.bodyText);
  if (issues.length === 1) {
    return `${issues[0]} Please adjust and try again.`;
  }
  if (issues.length > 1) {
    return `${issues.slice(0, 4).join(" · ")} Please adjust and try again.`;
  }

  const keys = parseProblemFieldKeys(e.bodyText);
  const phrases = keys.length
    ? [...new Set(keys.map(labelForFieldKey))]
    : [];

  if (phrases.length === 1) {
    return `Fix ${phrases[0]!} and try again.`;
  }
  if (phrases.length > 1) {
    const list = phrases.slice(0, 5).join(", ");
    return `Fix: ${list}. Then try again.`;
  }

  if (e.status === 400 || e.status === 422) {
    return "Update failed — check the form and try again.";
  }

  return "Couldn’t save changes. Try again.";
}

function messageForFindNotFound(e: ZinniaApiError, collected?: Record<string, unknown>): string {
  const fromPath = carrierCodeFromCarriersPath(e.path);
  const fromData =
    typeof collected?.carrierCode === "string"
      ? collected.carrierCode.trim().toUpperCase()
      : undefined;
  if (fromPath) {
    return `No carrier for code ${fromPath.toUpperCase()}. Check the code.`;
  }
  if (fromData) {
    return `No carrier for code ${fromData}. Check the code.`;
  }
  return "No carrier found for that code.";
}

function messageForZinniaApi(
  e: ZinniaApiError,
  workflowId: string | undefined,
  collected?: Record<string, unknown>,
): string {
  const { status, path, method } = e;

  if (status === 0) {
    return "Can’t reach the carrier system. Check connection and try again.";
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
      return `No carrier ${code} to update. Verify the code.`;
    }
    return "No carrier to update. Verify the code.";
  }

  if (status === 404 && method === "DELETE" && isSingleCarrierPath(path)) {
    const p = carrierCodeFromCarriersPath(path);
    const d =
      typeof collected?.carrierCode === "string"
        ? collected.carrierCode.trim().toUpperCase()
        : undefined;
    if (p || d) {
      const code = (p ?? d)!.toUpperCase();
      return `No carrier ${code} to delete. Verify the code.`;
    }
    return "No carrier to delete. Verify the code.";
  }

  if (
    (status === 400 || status === 422) &&
    method === "DELETE" &&
    isSingleCarrierPath(path)
  ) {
    const list = extractZinniaValidationIssuesFromBody(e.bodyText);
    if (list.length) {
      return `Couldn’t delete carrier: ${list.slice(0, 4).join(" · ")}`;
    }
    return "Couldn’t delete carrier. Check the request and try again.";
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
    return "Not allowed or session invalid. Contact your admin if this persists.";
  }

  if (status === 429) {
    return "Carrier system busy. Wait a moment and retry.";
  }

  if (path === "/carriers" && method === "GET") {
    const list = extractZinniaValidationIssuesFromBody(e.bodyText);
    if (list.length) {
      return `Couldn’t load carriers: ${list.slice(0, 4).join(" · ")}`;
    }
    return "Couldn’t load carriers. Try again.";
  }

  if (path === "/datapoints" || path.startsWith("/datapoints")) {
    return "Couldn’t load reference list. Try again.";
  }

  if (path.includes("/carriers/draft") && method === "POST") {
    return messageForCreateValidation(e);
  }

  if (method === "PUT" && isSingleCarrierPath(path)) {
    return messageForUpdateValidation(e);
  }

  if (method === "GET" && isSingleCarrierPath(path)) {
    if (status >= 500) {
      return "Lookup failed. Try again.";
    }
    if (status === 400 || status === 422) {
      const list = extractZinniaValidationIssuesFromBody(e.bodyText);
      if (list.length) {
        return `Couldn’t load carrier details: ${list.slice(0, 4).join(" · ")}`;
      }
      return "Couldn’t load carrier details. Try again.";
    }
    return messageForFindNotFound(e, collected);
  }

  if (status >= 500) {
    return "Carrier system error. Try again.";
  }

  return "Carrier system error. Try again.";
}

function messageForAuth(): string {
  return "Couldn’t sign in to the carrier system. Check configuration.";
}

/**
 * Calm, concise user-facing message. Never includes stack traces or raw API payloads.
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
      return "Add at least one field to update, then try again.";
    }
    if (/zinnia is not configured/i.test(m) || /not configured/i.test(m)) {
      return "Carrier system isn’t connected here.";
    }
    return "Something went wrong. Try again.";
  }

  return "Something went wrong. Try again.";
}
