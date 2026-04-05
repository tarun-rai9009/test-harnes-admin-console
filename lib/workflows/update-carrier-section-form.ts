import { UPDATE_CARRIER_FIELD_GROUPS } from "@/lib/workflows/definitions/update-carrier-catalog";
import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
  UPDATE_CATEGORY_LABELS,
  UPDATE_CATEGORY_ORDER,
} from "@/lib/workflows/definitions/update-carrier-constants";
import {
  updateCarrierHasCategoryChanges,
} from "@/lib/workflows/definitions/update-carrier-payload";
import { getUpdateCarrierNoChangesMessage } from "@/lib/workflows/definitions/update-carrier-catalog";
import { getOpenApiUpdateSectionRequirementErrors } from "@/lib/workflows/update-carrier-openapi-requirements";
import type { WorkflowFieldDefinition } from "@/lib/workflows/workflow-types";
import type { UpdateCarrierSectionFormState } from "@/types/chat-assistant";

const MULTILINE_KEYS = new Set([
  "basic_productTypes",
  "reg_authorizedJurisdictionStates",
]);

export function isUpdateCategoryId(s: string): s is UpdateCategoryId {
  return (UPDATE_CATEGORY_ORDER as readonly string[]).includes(s);
}

export function listUpdateCarrierCategories(): { id: UpdateCategoryId; label: string }[] {
  return UPDATE_CATEGORY_ORDER.map((id) => ({
    id,
    label: UPDATE_CATEGORY_LABELS[id],
  }));
}

export function getFieldDefsForUpdateCategory(
  categoryId: UpdateCategoryId,
): WorkflowFieldDefinition[] {
  const g = UPDATE_CARRIER_FIELD_GROUPS.find((gr) =>
    gr.isActive?.({ updateCategory: categoryId }),
  );
  return g?.optionalFields ?? [];
}

export type UpdateCarrierSectionFormField = {
  key: string;
  label: string;
  required: boolean;
  multiline?: boolean;
};

/** Build form state from raw strings (e.g. after failed validation — preserve user input). */
export function buildUpdateSectionFormStateFromStrings(
  categoryId: UpdateCategoryId,
  values: Record<string, string>,
  errors: Record<string, string> = {},
  formLevelError?: string,
): UpdateCarrierSectionFormState {
  const fields = buildUpdateCarrierSectionFormFields(categoryId);
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.key] = values[f.key] ?? "";
  }
  return { fields, values: out, errors, formLevelError };
}

export function buildUpdateCarrierSectionFormFields(
  categoryId: UpdateCategoryId,
): UpdateCarrierSectionFormField[] {
  return getFieldDefsForUpdateCategory(categoryId).map((d) => ({
    key: d.key,
    label: d.summaryLabel ?? d.key,
    required: d.required,
    multiline: MULTILINE_KEYS.has(d.key),
  }));
}

export function stringValuesForUpdateSection(
  data: Record<string, unknown>,
  categoryId: UpdateCategoryId,
): Record<string, string> {
  const keys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = data[k];
    if (v === undefined || v === null) {
      out[k] = "";
      continue;
    }
    if (typeof v === "boolean") {
      out[k] = v ? "yes" : "no";
    } else if (Array.isArray(v)) {
      out[k] = v.join(", ");
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

export type ValidateSectionResult =
  | { ok: true; merged: Record<string, unknown> }
  | {
      ok: false;
      errors: Record<string, string>;
      formLevelError?: string;
    };

/**
 * Validates form strings, merges normalized values into a copy of `baseCollected`,
 * and ensures at least one field in the section has a value to send.
 */
export function validateAndMergeUpdateCarrierSection(
  baseCollected: Record<string, unknown>,
  categoryId: UpdateCategoryId,
  values: Record<string, string>,
): ValidateSectionResult {
  const defs = getFieldDefsForUpdateCategory(categoryId);
  const merged: Record<string, unknown> = { ...baseCollected };
  merged.updateCategory = categoryId;

  const catKeys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  for (const k of catKeys) {
    delete merged[k];
  }

  const errors: Record<string, string> = {};

  for (const def of defs) {
    const raw = values[def.key] ?? "";
    const res = def.validate(raw);
    if (!res.ok) {
      errors[def.key] = res.error;
      continue;
    }
    const n = res.normalized;
    if (n === "" || n === undefined || n === null) {
      continue;
    }
    if (Array.isArray(n) && n.length === 0) {
      continue;
    }
    merged[def.key] = n;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const openapiReqErrors = getOpenApiUpdateSectionRequirementErrors(
    categoryId,
    values,
  );
  if (Object.keys(openapiReqErrors).length > 0) {
    return { ok: false, errors: openapiReqErrors };
  }

  if (!updateCarrierHasCategoryChanges(merged)) {
    return {
      ok: false,
      errors: {},
      formLevelError: getUpdateCarrierNoChangesMessage(),
    };
  }

  return { ok: true, merged };
}
