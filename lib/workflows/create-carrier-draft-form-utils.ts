/**
 * Create-carrier draft form helpers — safe for client and server (no Zinnia imports).
 */

import type {
  CreateCarrierDraftFormState,
} from "@/types/chat-assistant";
import { enumFieldMetaForKey } from "@/lib/workflows/carrier-form-enum-ui";
import type { CreateCarrierDraftPayload } from "@/types/zinnia/carriers";
import { trimString } from "@/lib/workflows/validators";

export const FIELD_ORDER = [
  "carrierCode",
  "carrierName",
  "entityType",
  "organizationName",
  "organizationDba",
  "lineOfBusiness",
  "productTypes",
  "ultimateParentCompanyId",
  "parentCompanyId",
] as const;

export const CREATE_CARRIER_DRAFT_FORM_KEYS = FIELD_ORDER;

export const CREATE_CARRIER_DRAFT_REQUIRED_KEYS = [
  "carrierCode",
  "carrierName",
  "entityType",
  "organizationName",
] as const satisfies ReadonlyArray<(typeof FIELD_ORDER)[number]>;

export const REQUIRED_SET = new Set<string>(CREATE_CARRIER_DRAFT_REQUIRED_KEYS);

export const SUMMARY_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  carrierCode: "Carrier Code",
  carrierName: "Carrier Name",
  entityType: "Entity Type",
  organizationName: "Organization Name",
  organizationDba: "DBA",
  lineOfBusiness: "Line of Business",
  productTypes: "Product Types",
  ultimateParentCompanyId: "Ultimate Parent Company ID",
  parentCompanyId: "Parent Company ID",
};

function formatValueForSummary(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

export function buildCreateDraftPayload(
  data: Record<string, unknown>,
): CreateCarrierDraftPayload {
  const carrierCode = String(data.carrierCode ?? "").trim().toUpperCase();
  const entityType = String(data.entityType ?? "").trim();
  const carrierName = String(data.carrierName ?? "").trim();
  const organizationName = String(data.organizationName ?? "").trim();

  const payload: CreateCarrierDraftPayload = {
    carrierCode,
    entityType,
    carrierName,
    organizationName,
  };

  const dba = trimString(data.organizationDba);
  if (dba) payload.organizationDba = dba;

  const lob = trimString(data.lineOfBusiness);
  if (lob) payload.lineOfBusiness = lob;

  const pt = data.productTypes;
  if (Array.isArray(pt) && pt.length > 0) {
    payload.productTypes = pt.map((x) => String(x).trim()).filter(Boolean);
  }

  const ultimate = trimString(data.ultimateParentCompanyId);
  if (ultimate) payload.ultimateParentCompanyId = ultimate;

  const parent = trimString(data.parentCompanyId);
  if (parent) payload.parentCompanyId = parent;

  return payload;
}

export function buildCreateCarrierDraftFormState(
  merged: Record<string, unknown>,
  errors: Record<string, string>,
  formLevelError?: string,
): CreateCarrierDraftFormState {
  const fields = FIELD_ORDER.map((key) => {
    const meta = enumFieldMetaForKey(key);
    return {
      key,
      label: SUMMARY_LABELS[key],
      required: REQUIRED_SET.has(key),
      multiline: false,
      ...(meta ?? {}),
    };
  });
  const values: Record<string, string> = {};
  for (const key of FIELD_ORDER) {
    const v = merged[key];
    if (v === undefined || v === null) values[key] = "";
    else if (Array.isArray(v)) values[key] = v.join(", ");
    else values[key] = String(v);
  }
  return {
    fields,
    values,
    errors,
    formLevelError: formLevelError?.trim() || undefined,
  };
}

/** Merge a client form object into collected params (all keys in FIELD_ORDER). */
export function mergeCreateCarrierDraftFormIntoCollected(
  current: Record<string, unknown>,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current };

  for (const key of FIELD_ORDER) {
    if (!(key in raw)) continue;
    const rv = raw[key];
    const s = rv === undefined || rv === null ? "" : String(rv).trim();

    if (key === "productTypes") {
      if (!s) delete next[key];
      else {
        next[key] = s
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter(Boolean);
      }
      continue;
    }

    if (key === "carrierCode") {
      if (!s) {
        if (REQUIRED_SET.has(key)) next[key] = "";
        else delete next[key];
      } else next[key] = s.toUpperCase();
      continue;
    }

    if (!s) {
      if (REQUIRED_SET.has(key)) next[key] = "";
      else delete next[key];
    } else {
      next[key] = s;
    }
  }

  return next;
}

export function getCreateCarrierConfirmationRows(
  data: Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const key of FIELD_ORDER) {
    const label = SUMMARY_LABELS[key];
    const raw = data[key];
    rows.push({ label, value: formatValueForSummary(raw) });
  }
  return rows;
}
