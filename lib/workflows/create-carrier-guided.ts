/** Guided copy for the create-carrier conversation (orchestrator only). */

/** OpenAPI-required fields only (optional details are asked separately). */
export const CREATE_CARRIER_FIELD_COUNT = 4;

/**
 * Warm, step-by-step framing before the next question.
 * Users may answer several fields in one message; we still ask for the next missing key.
 */
export function buildCreateCarrierCollectingMessage(parts: {
  missingCount: number;
  fieldPrompt: string;
  preamble?: string;
  followUp?: string;
}): string {
  const { missingCount, fieldPrompt, preamble, followUp } = parts;
  const filled = CREATE_CARRIER_FIELD_COUNT - missingCount;

  const stepLabel =
    filled > 0
      ? ` (${filled} of ${CREATE_CARRIER_FIELD_COUNT} sections filled)`
      : "";

  let bridge: string;
  if (filled === 0) {
    bridge = "New carrier setup — answer below (or paste several at once).";
  } else if (missingCount === 1) {
    bridge = `Almost there${stepLabel}. Last question:`;
  } else if (missingCount <= 3) {
    bridge = `Good progress${stepLabel}. Next:`;
  } else {
    bridge = `Next${stepLabel}:`;
  }

  return [preamble, bridge, fieldPrompt, followUp].filter(Boolean).join("\n\n");
}
