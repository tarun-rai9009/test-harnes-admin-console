/**
 * Shared create-carrier draft validation for client and server (no Zinnia).
 */

import { allowedValuesForSchema } from "@/lib/datapoints/enum-options-from-reference";
import {
  mergeCreateCarrierDraftFormIntoCollected,
} from "@/lib/workflows/create-carrier-draft-form-utils";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { validateCollectedParamsBeforeExecute } from "@/lib/workflows/validate-collected";
import {
  createCarrierDraftOptionalFields,
  createCarrierDraftRequiredFields,
} from "@/lib/workflows/definitions/create-carrier-draft-workflow-fields";
import type { DatapointReferenceMap } from "@/types/zinnia/datapoints";
import {
  validateOptionalEnumInSet,
  validateRequiredEnumInSet,
} from "@/lib/workflows/validators";

const CREATE_CARRIER_VALIDATE_DEF = {
  id: "create_carrier_draft",
  requiredFields: createCarrierDraftRequiredFields,
  optionalFields: createCarrierDraftOptionalFields,
} as unknown as WorkflowDefinition;

function datapointEnumErrorsForCreate(
  merged: Record<string, unknown>,
  referenceByKey: DatapointReferenceMap,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!referenceByKey || Object.keys(referenceByKey).length === 0) {
    return errors;
  }

  const et = merged.entityType;
  if (typeof et === "string" && et.trim()) {
    const allow = allowedValuesForSchema(referenceByKey, "EntityTypeEnum");
    const r = validateRequiredEnumInSet("entity type", allow)(et);
    if (!r.ok) errors.entityType = r.error;
  }

  const lob = merged.lineOfBusiness;
  if (typeof lob === "string" && lob.trim()) {
    const allow = allowedValuesForSchema(
      referenceByKey,
      "LineOfBusinessEnum",
    );
    const r = validateOptionalEnumInSet("line of business", allow)(lob);
    if (!r.ok) errors.lineOfBusiness = r.error;
  }

  const pt = merged.productTypes;
  if (Array.isArray(pt) && pt.length > 0) {
    const allow = allowedValuesForSchema(referenceByKey, "ProductTypeEnum");
    for (const p of pt) {
      const s = String(p).trim();
      if (!s) continue;
      if (allow.has(s)) continue;
      const ci = [...allow].find(
        (v) => v.toLowerCase() === s.toLowerCase(),
      );
      if (!ci) {
        errors.productTypes = `Unknown product type “${s}”. Use allowed values or leave empty.`;
        break;
      }
    }
  }

  return errors;
}

export function validateCreateCarrierDraftMerged(
  merged: Record<string, unknown>,
  referenceByKey?: DatapointReferenceMap,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const base = validateCollectedParamsBeforeExecute(
    CREATE_CARRIER_VALIDATE_DEF,
    merged,
  );
  if (!base.ok) return base;
  if (referenceByKey && Object.keys(referenceByKey).length > 0) {
    const extra = datapointEnumErrorsForCreate(merged, referenceByKey);
    if (Object.keys(extra).length > 0) return { ok: false, errors: extra };
  }
  return { ok: true };
}

/** Validate raw string values from the form (same rules as server). */
export function validateCreateCarrierDraftFormValues(
  values: Record<string, string>,
  referenceByKey?: DatapointReferenceMap,
): { ok: true; merged: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const merged = mergeCreateCarrierDraftFormIntoCollected({}, values);
  const r = validateCreateCarrierDraftMerged(merged, referenceByKey);
  if (!r.ok) return { ok: false, errors: r.errors };
  return { ok: true, merged };
}
