/**
 * Workflow engine: resolves fields from flat definitions or dynamic field groups.
 * Keeps chat/session logic agnostic of how a workflow declares its fields.
 */

import type {
  WorkflowDefinition,
  WorkflowFieldDefinition,
  WorkflowFieldGroupDefinition,
} from "@/lib/workflows/workflow-types";

function usesFieldGroups(def: WorkflowDefinition): boolean {
  return Boolean(def.fieldGroups && def.fieldGroups.length > 0);
}

function filterActiveGroups(
  groups: WorkflowFieldGroupDefinition[],
  data: Record<string, unknown>,
): WorkflowFieldGroupDefinition[] {
  return groups.filter((g) => (g.isActive ? g.isActive(data) : true));
}

/** Active groups for this definition and current collected data. */
export function getActiveFieldGroups(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): WorkflowFieldGroupDefinition[] {
  if (usesFieldGroups(def)) {
    return filterActiveGroups(def.fieldGroups!, data);
  }
  return [
    {
      id: "_flat",
      requiredFields: def.requiredFields,
      optionalFields: def.optionalFields,
    },
  ];
}

/** All fields that may be collected (union of active groups), first occurrence wins. */
export function getAllFieldDefinitions(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): WorkflowFieldDefinition[] {
  const seen = new Set<string>();
  const out: WorkflowFieldDefinition[] = [];
  for (const g of getActiveFieldGroups(def, data)) {
    for (const f of [...g.requiredFields, ...g.optionalFields]) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      out.push(f);
    }
  }
  return out;
}

export function getRequiredFieldDefinitions(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): WorkflowFieldDefinition[] {
  const seen = new Set<string>();
  const out: WorkflowFieldDefinition[] = [];
  for (const g of getActiveFieldGroups(def, data)) {
    for (const f of g.requiredFields) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      out.push(f);
    }
  }
  return out;
}

export function getOptionalFieldDefinitions(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): WorkflowFieldDefinition[] {
  const seen = new Set<string>();
  const out: WorkflowFieldDefinition[] = [];
  for (const g of getActiveFieldGroups(def, data)) {
    for (const f of g.optionalFields) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      out.push(f);
    }
  }
  return out;
}

export function getOptionalFieldKeysInOrder(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): string[] {
  return getOptionalFieldDefinitions(def, data).map((f) => f.key);
}

export function findFieldDefinition(
  def: WorkflowDefinition,
  key: string,
  data: Record<string, unknown>,
): WorkflowFieldDefinition | undefined {
  return getAllFieldDefinitions(def, data).find((f) => f.key === key);
}

export function workflowUsesFieldGroups(def: WorkflowDefinition): boolean {
  return usesFieldGroups(def);
}
