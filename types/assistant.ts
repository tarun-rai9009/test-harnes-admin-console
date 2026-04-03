/**
 * Assistant orchestration — intents, workflow memory, and API-facing responses.
 */

import type {
  CreateCarrierDraftPayload,
  UpdateCarrierPayload,
} from "@/types/zinnia/carriers";

/** High-level routing from user text / tool output. */
export type ChatIntent =
  | { kind: "create_carrier"; confidence?: number }
  | {
      kind: "update_carrier";
      carrierCode?: string;
      confidence?: number;
    }
  | { kind: "get_carrier"; carrierCode?: string; confidence?: number }
  | { kind: "list_carriers"; confidence?: number }
  | { kind: "get_datapoints"; confidence?: number }
  | { kind: "general_help" }
  | { kind: "unknown"; note?: string };

export type WorkflowId =
  | "idle"
  | "create_carrier"
  | "update_carrier"
  | "list_carriers"
  | "get_datapoints";

type WorkflowBase = {
  workflowId: WorkflowId;
  /** Monotonic step index within the workflow */
  step: number;
};

export type WorkflowState =
  | (WorkflowBase & {
      workflowId: "idle";
      step: 0;
    })
  | (WorkflowBase & {
      workflowId: "create_carrier";
      draft: Partial<CreateCarrierDraftPayload>;
    })
  | (WorkflowBase & {
      workflowId: "update_carrier";
      carrierCode: string;
      updates: Partial<UpdateCarrierPayload>;
    })
  | (WorkflowBase & {
      workflowId: "list_carriers";
    })
  | (WorkflowBase & {
      workflowId: "get_datapoints";
    });

export type AssistantResultKind =
  | "success"
  | "error"
  | "needs_input"
  | "in_progress";

/**
 * Payload returned from server chat orchestration to the UI.
 * Keep summaries in business language — avoid raw API JSON in `userFacingMessage`.
 */
export type AssistantResponsePayload = {
  userFacingMessage: string;
  resultKind: AssistantResultKind;
  /** Short bullet-style facts for optional UI rendering */
  summaryLines?: string[];
  /** Suggested replies / next questions */
  nextSuggestedPrompts?: string[];
  intent?: ChatIntent;
  workflow?: WorkflowState;
};
