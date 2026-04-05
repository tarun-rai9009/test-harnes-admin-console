/** Short guided copy when we still need a carrier code to look someone up. */

export function buildFindCarrierCollectingMessage(parts: {
  fieldPrompt: string;
  preamble?: string;
  followUp?: string;
}): string {
  const bridge = "I need the 4-character carrier code.";
  return [parts.preamble, bridge, parts.fieldPrompt, parts.followUp]
    .filter(Boolean)
    .join("\n\n");
}
