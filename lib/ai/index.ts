/**
 * AI layer: intent + extraction + optional phrasing. Workflow execution lives in `lib/workflows`.
 */

export { analyzeUserUtterance } from "./analyze";
export { analyzeWithHeuristics } from "./heuristics";
export { mapAiIntentToWorkflowId } from "./intent-map";
export type {
  AiIntentId,
  CreateCarrierExtractableKey,
  ExtractedFields,
  ExtractedScalar,
  IntentAnalysisResult,
  UtteranceContext,
} from "./types";
