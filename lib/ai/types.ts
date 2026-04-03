/**
 * AI layer output — intent + extracted facts only. Workflow execution stays in code.
 */

export type AiIntentId =
  | "create_carrier_draft"
  | "get_carrier_by_code"
  | "get_all_carriers"
  | "get_datapoints"
  | "unknown";

/** Keys the workflow engine can merge for create draft. */
export type CreateCarrierExtractableKey =
  | "carrierCode"
  | "carrierName"
  | "entityType"
  | "organizationName"
  | "organizationDba"
  | "lineOfBusiness"
  | "productTypes"
  | "ultimateParentCompanyId"
  | "parentCompanyId";

export type ExtractedScalar = string | string[];

export type ExtractedFields = Partial<
  Record<CreateCarrierExtractableKey, ExtractedScalar>
>;

export type IntentAnalysisResult = {
  intent: AiIntentId;
  extractedFields: ExtractedFields;
  /** 0–1; heuristic path uses lower values when ambiguous */
  confidence: number;
  /** Short friendly acknowledgment — no fabricated data */
  naturalPreamble?: string;
  /**
   * Optional softer phrasing for the next question (orchestrator may ignore).
   * Must not introduce new facts.
   */
  suggestedFollowUp?: string;
};

export type UtteranceContext = {
  /**
   * When the user is likely answering a workflow question, pass the field key
   * so free-text replies map without forcing a top-level intent.
   */
  expectingFieldKey?: string;
  expectingWorkflowId?: string;
};
