/** Guided copy for the create-carrier conversation (orchestrator only). */

export const CREATE_CARRIER_FIELD_COUNT = 9;

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
    bridge =
      "I’ll walk you through setting up a new carrier. We’ll take it one question at a time — or you can paste several answers at once if you already have them handy.";
  } else if (missingCount === 1) {
    bridge = `Almost there${stepLabel}. One last question:`;
  } else if (missingCount <= 3) {
    bridge = `Nice progress${stepLabel}. A few more questions:`;
  } else {
    bridge = `Got it${stepLabel}. Here’s the next thing I need:`;
  }

  return [preamble, bridge, fieldPrompt, followUp].filter(Boolean).join("\n\n");
}
