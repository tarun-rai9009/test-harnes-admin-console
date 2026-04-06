/** Short copy when we still need a carrier code; panel form carries the rest. */

export function buildFindCarrierCollectingMessage(parts: {
  fieldPrompt: string;
  /** Validation error only — do not pass generic model preamble. */
  validationNote?: string;
}): string {
  return [parts.validationNote, parts.fieldPrompt].filter(Boolean).join("\n\n");
}
