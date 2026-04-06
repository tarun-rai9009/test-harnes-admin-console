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
  /** Action buttons that send a message when clicked */
  actions?: { label: string; message: string }[];
};

export type FormFieldSelectOption = { value: string; label: string };

export type CreateCarrierDraftFormField = {
  key: string;
  label: string;
  required: boolean;
  /** Use a taller input (free text only; not used when enumOptions is set). */
  multiline?: boolean;
  /** From OpenAPI enum — render as `<select>`. */
  enumOptions?: FormFieldSelectOption[];
  /** Multi-value enum (e.g. product types); comma-separated in `values`. */
  selectMultiple?: boolean;
};

/** Shown when create-draft validation fails or user is correcting fields before save. */
export type CreateCarrierDraftFormState = {
  fields: CreateCarrierDraftFormField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  /** Non-field-specific message (e.g. Zinnia business error or network). */
  formLevelError?: string;
};

/** Same shape as create-draft section fields; used for per-category update forms. */
export type UpdateCarrierSectionFormState = CreateCarrierDraftFormState;

export type UpdateCarrierFlowPayload =
  | { step: "need_code"; codeError?: string }
  | {
      step: "pick_category";
      carrierCode: string;
      categories: { id: string; label: string }[];
      categoryError?: string;
      /** When true, user selects one or more sections (checkboxes) then continues. */
      multiSelect?: boolean;
    }
  | {
      step: "multi_section_form";
      carrierCode: string;
      categoryForms: Array<{
        categoryId: string;
        categoryLabel: string;
        form: UpdateCarrierSectionFormState;
      }>;
    }
  | {
      step: "section_form";
      carrierCode: string;
      categoryId: string;
      categoryLabel: string;
      form: UpdateCarrierSectionFormState;
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
  /** New carrier draft: full form + field errors (client highlights invalid inputs). */
  createCarrierDraftForm?: CreateCarrierDraftFormState | null;
  /** Update carrier: structured UI (code → categories → section form). */
  updateCarrierFlow?: UpdateCarrierFlowPayload | null;
};

export type ChatApiRequestBody = {
  sessionId: string;
  message: string;
  /** When set with create_carrier_draft session, merges into collected params and re-validates. */
  createCarrierDraftForm?: Record<string, unknown>;
  /** Update flow: submit carrier code (need_code phase). */
  updateCarrierCode?: string;
  /** Update flow: choose section (pick_category phase). */
  updateCarrierCategoryId?: string;
  /** Update flow: choose one or more sections (pick_category with multiSelect). */
  updateCarrierCategoryIds?: string[];
  /** Update flow: submit section fields (section_form phase). */
  updateCarrierSectionForm?: Record<string, string>;
  /** Update flow: go back to carrier code or category list. */
  updateCarrierNavigate?: "back_carrier_code" | "back_categories";
};

export type ChatApiSuccessBody = ChatAssistantApiPayload & {
  sessionId: string;
  conversationHistory: ChatMessage[];
};
