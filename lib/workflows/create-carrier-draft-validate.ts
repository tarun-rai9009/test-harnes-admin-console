/**
 * Shared create-carrier draft validation for client and server (no Zinnia).
 */

import {
  mergeCreateCarrierDraftFormIntoCollected,
} from "@/lib/workflows/create-carrier-draft-form-utils";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { validateCollectedParamsBeforeExecute } from "@/lib/workflows/validate-collected";
import {
  createCarrierDraftOptionalFields,
  createCarrierDraftRequiredFields,
} from "@/lib/workflows/definitions/create-carrier-draft-workflow-fields";

const CREATE_CARRIER_VALIDATE_DEF = {
  id: "create_carrier_draft",
  requiredFields: createCarrierDraftRequiredFields,
  optionalFields: createCarrierDraftOptionalFields,
} as unknown as WorkflowDefinition;

export function validateCreateCarrierDraftMerged(
  merged: Record<string, unknown>,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  return validateCollectedParamsBeforeExecute(
    CREATE_CARRIER_VALIDATE_DEF,
    merged,
  );
}

/** Validate raw string values from the form (same rules as server). */
export function validateCreateCarrierDraftFormValues(
  values: Record<string, string>,
): { ok: true; merged: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const merged = mergeCreateCarrierDraftFormIntoCollected({}, values);
  const r = validateCreateCarrierDraftMerged(merged);
  if (!r.ok) return { ok: false, errors: r.errors };
  return { ok: true, merged };
}
