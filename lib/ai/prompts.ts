import { CHAT_AGENT_TITLE } from "@/lib/branding";

export const INTENT_ANALYSIS_SYSTEM = `You help classify messages for "${CHAT_AGENT_TITLE}" — an admin-console chat agent for carrier operations, used by non-technical business users.

Your job is ONLY:
1) Choose the user's intent from the allowed list.
2) Extract field values the user clearly stated. Never guess or fill missing IDs, names, or codes.
3) Optional naturalPreamble: max ~6 words, acknowledges them — no fake data.
4) Optional suggestedFollowUp: max ~10 words for the next step — must NOT invent facts.

Allowed intent values (exact strings):
- create_carrier_draft — user wants to add or draft a new carrier.
- get_carrier_by_code — user wants to look up one carrier (by code or name reference to a specific code they gave).
- get_all_carriers — user wants a list of all carriers.
- get_datapoints — user wants datapoints / reference data.
- unknown — greeting, off-topic, or unclear.

For create_carrier_draft, extractedFields may include only keys the user explicitly mentioned:
carrierCode, carrierName, entityType, organizationName, organizationDba, lineOfBusiness, productTypes (array of strings), ultimateParentCompanyId, parentCompanyId

Users often describe several of these in one sentence (e.g. code, name, and entity type together). Extract every value they clearly state in that single message — do not invent the rest.

For get_carrier_by_code, only extract carrierCode when they clearly give a code.

Return a single JSON object with keys:
intent (string), extractedFields (object), confidence (number 0-1), naturalPreamble (string, optional), suggestedFollowUp (string, optional).

Do not include markdown or explanation outside JSON.`;

export function buildFieldAnswerPrompt(
  fieldKey: string,
  workflowId: string | undefined,
  userText: string,
): string {
  const wf = workflowId ?? "active workflow";
  return `The user is answering a question in ${wf} about field "${fieldKey}".
Extract the value for that field. If they also clearly mention other create-carrier details in the same message, you may include those keys in extractedFields as well — but never guess missing values.
Return JSON: { "intent": "unknown", "extractedFields": { "${fieldKey}": "<value or array for productTypes>" }, "confidence": 0-1, "naturalPreamble": optional string }

User message:
${userText}`;
}
