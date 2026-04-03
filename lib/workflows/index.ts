/**
 * Workflow definitions: e.g. "create carrier" — step ordering, required fields,
 * mapping business answers → backend payloads (users never see raw JSON).
 *
 * Engine (`./engine`) resolves flat vs. grouped fields; `./payload-nest` helps
 * map flat collected params into nested API bodies inside `buildPayload`.
 */

import type { WorkflowId as AssistantWorkflowId } from "@/types/assistant";

export {
  findFieldDefinition,
  getActiveFieldGroups,
  getAllFieldDefinitions,
  getOptionalFieldDefinitions,
  getOptionalFieldKeysInOrder,
  getRequiredFieldDefinitions,
  workflowUsesFieldGroups,
} from "@/lib/workflows/engine";
export {
  mapFlatToNestedPaths,
  mapFlatToNestedWithRemainder,
} from "@/lib/workflows/payload-nest";
export type { WorkflowFieldGroupDefinition } from "@/lib/workflows/workflow-types";

export type WorkflowId = AssistantWorkflowId;

export type WorkflowPlaceholder = {
  id: WorkflowId;
};

export const WORKFLOW_REGISTRY: Record<string, WorkflowPlaceholder> = {
  create_carrier: { id: "create_carrier" },
  update_carrier: { id: "update_carrier" },
  list_carriers: { id: "list_carriers" },
  get_datapoints: { id: "get_datapoints" },
};
