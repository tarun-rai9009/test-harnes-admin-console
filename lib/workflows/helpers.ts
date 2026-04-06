import {
  findFieldDefinition,
  getAllFieldDefinitions,
  getOptionalFieldDefinitions,
  getRequiredFieldDefinitions,
} from "@/lib/workflows/engine";
import type {
  WorkflowDefinition,
  WorkflowFieldDefinition,
} from "@/lib/workflows/workflow-types";

function formatValueForDisplay(key: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Required keys that are missing or fail validation.
 */
export function getMissingFields(
  definition: WorkflowDefinition,
  data: Record<string, unknown>,
): string[] {
  const missing: string[] = [];
  for (const field of getRequiredFieldDefinitions(definition, data)) {
    const result = field.validate(data[field.key]);
    if (!result.ok) {
      missing.push(field.key);
    }
  }
  return missing;
}

export function validateField(
  field: WorkflowFieldDefinition,
  raw: unknown,
): ReturnType<WorkflowFieldDefinition["validate"]> {
  return field.validate(raw);
}

/**
 * Merge only keys that exist on the workflow. Validates each value; invalid keys are skipped and reported.
 * Never invents values — only uses `extracted` and validated results.
 */
export function mergeExtractedFields(
  definition: WorkflowDefinition,
  current: Record<string, unknown>,
  extracted: Record<string, unknown>,
): { merged: Record<string, unknown>; rejected: { key: string; error: string }[] } {
  const merged = { ...current };
  const rejected: { key: string; error: string }[] = [];
  const preview = { ...current, ...extracted };
  const fieldsNow = getAllFieldDefinitions(definition, current);
  const fieldsAfterPreview = getAllFieldDefinitions(definition, preview);
  const fieldByKey = new Map<string, WorkflowFieldDefinition>();
  for (const f of [...fieldsNow, ...fieldsAfterPreview]) {
    if (!fieldByKey.has(f.key)) fieldByKey.set(f.key, f);
  }
  const allowed = new Set(fieldByKey.keys());

  for (const [key, value] of Object.entries(extracted)) {
    if (!allowed.has(key)) continue;
    const field = fieldByKey.get(key);
    if (!field) continue;
    const result = field.validate(value);
    if (result.ok) {
      if (
        typeof result.normalized === "string" &&
        result.normalized === "" &&
        !field.required
      ) {
        delete merged[key];
      } else {
        merged[key] = result.normalized;
      }
    } else {
      rejected.push({ key, error: result.error });
    }
  }

  return { merged, rejected };
}

/**
 * Human-readable confirmation block (business language only).
 */
export function formatConfirmationCard(
  definition: WorkflowDefinition,
  data: Record<string, unknown>,
): string {
  const lines: string[] = [
    `Please confirm — ${definition.userFacingLabel}`,
    "",
  ];

  for (const field of getRequiredFieldDefinitions(definition, data)) {
    const v = data[field.key];
    const result = field.validate(v);
    if (!result.ok) continue;
    const label =
      field.summaryLabel ?? field.businessPrompt.replace(/\?$/, "");
    lines.push(`• ${label}: ${formatValueForDisplay(field.key, result.normalized)}`);
  }

  for (const field of getOptionalFieldDefinitions(definition, data)) {
    if (data[field.key] === undefined) continue;
    const result = field.validate(data[field.key]);
    if (!result.ok || result.normalized === "") continue;
    const label =
      field.summaryLabel ?? field.businessPrompt.replace(/\?$/, "");
    lines.push(`• ${label}: ${formatValueForDisplay(field.key, result.normalized)}`);
  }

  lines.push(
    "",
    "Reply yes to go ahead, or no to cancel.",
  );
  return lines.join("\n");
}

export function formatSuccessResponse(
  definition: WorkflowDefinition,
  result: unknown,
): {
  message: string;
  summaryLines?: string[];
  summaryFields?: { label: string; value: string }[];
  summaryTable?: {
    columns: { id: string; label: string }[];
    rows: Record<string, string>[];
  };
  actions?: { label: string; message: string }[];
} {
  return definition.formatSuccess(result);
}

export function findFieldDef(
  definition: WorkflowDefinition,
  key: string,
  data: Record<string, unknown> = {},
): WorkflowFieldDefinition | undefined {
  return findFieldDefinition(definition, key, data);
}

export function firstMissingField(
  definition: WorkflowDefinition,
  data: Record<string, unknown>,
): WorkflowFieldDefinition | undefined {
  const missing = getMissingFields(definition, data);
  if (!missing.length) return undefined;
  const key = missing[0]!;
  return findFieldDef(definition, key, data);
}
