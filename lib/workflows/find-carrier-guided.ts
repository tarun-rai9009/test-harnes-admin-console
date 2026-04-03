/** Short guided copy when we still need a carrier code to look someone up. */

export function buildFindCarrierCollectingMessage(parts: {
  fieldPrompt: string;
  preamble?: string;
  followUp?: string;
}): string {
  const bridge =
    "I can pull that up for you. I just need the carrier code — the short identifier your team uses for that carrier.";
  return [parts.preamble, bridge, parts.fieldPrompt, parts.followUp]
    .filter(Boolean)
    .join("\n\n");
}
