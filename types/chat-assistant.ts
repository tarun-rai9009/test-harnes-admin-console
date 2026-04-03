/**
 * Structured chat API response for UI rendering (App Router route handlers).
 */

import type { ChatMessage } from "./chat";

export type ChatResponseType =
  | "greeting"
  | "needs_input"
  | "confirm"
  | "success"
  | "error"
  | "in_progress";

export type ChatSummaryTable = {
  columns: { id: string; label: string }[];
  rows: Record<string, string>[];
};

export type ChatSummaryCard = {
  title?: string;
  lines?: string[];
  /** Key/value rows for confirmation or detail cards */
  fields?: { label: string; value: string }[];
  /** Simple grid for lists (human column labels) */
  table?: ChatSummaryTable;
};

export type ChatAssistantApiPayload = {
  message: string;
  responseType: ChatResponseType;
  summaryCard?: ChatSummaryCard;
  /** Structured payload for rich UI (e.g. carrier detail, list rows) */
  resultData?: unknown;
  missingFields?: string[];
  awaitingConfirmation: boolean;
  /** Workflow definition id, e.g. create_carrier_draft */
  workflowId: string | null;
  /** Human-readable workflow title */
  workflowName: string | null;
};

export type ChatApiRequestBody = {
  sessionId: string;
  message: string;
};

export type ChatApiSuccessBody = ChatAssistantApiPayload & {
  sessionId: string;
  conversationHistory: ChatMessage[];
};
