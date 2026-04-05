import {
  getOptionalFieldDefinitions,
  getRequiredFieldDefinitions,
} from "@/lib/workflows/engine";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Re-validates all collected params before calling Zinnia (or showing final confirm).
 * Required fields are always checked; optional fields are validated only when filled.
 */
export function validateCollectedParamsBeforeExecute(
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  data: Record<string, unknown> = merged,
):
  | { ok: true }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const f of getRequiredFieldDefinitions(def, data)) {
    const r = f.validate(merged[f.key]);
    if (!r.ok) errors[f.key] = r.error;
  }

  for (const f of getOptionalFieldDefinitions(def, data)) {
    if (!isPresent(merged[f.key])) continue;
    const r = f.validate(merged[f.key]);
    if (!r.ok) errors[f.key] = r.error;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
