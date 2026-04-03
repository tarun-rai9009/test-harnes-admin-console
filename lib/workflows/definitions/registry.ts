import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { createCarrierDraftWorkflow } from "@/lib/workflows/definitions/create-carrier-draft";
import { showDatapointsWorkflow } from "@/lib/workflows/definitions/datapoints";
import { findCarrierWorkflow } from "@/lib/workflows/definitions/find-carrier";
import { listCarriersWorkflow } from "@/lib/workflows/definitions/list-carriers";
import { updateCarrierWorkflow } from "@/lib/workflows/definitions/update-carrier";

const list: WorkflowDefinition[] = [
  createCarrierDraftWorkflow,
  findCarrierWorkflow,
  listCarriersWorkflow,
  showDatapointsWorkflow,
  updateCarrierWorkflow,
];

export const WORKFLOW_REGISTRY: Record<string, WorkflowDefinition> =
  Object.fromEntries(list.map((w) => [w.id, w]));

export function getWorkflowDefinition(
  id: string,
): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY[id];
}

export function listWorkflowSummaries(): {
  id: string;
  userFacingLabel: string;
}[] {
  return list.map((w) => ({ id: w.id, userFacingLabel: w.userFacingLabel }));
}
