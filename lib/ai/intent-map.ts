import type { AiIntentId } from "@/lib/ai/types";

/**
 * Maps AI intents to deterministic workflow definition ids in `lib/workflows`.
 */
export function mapAiIntentToWorkflowId(intent: AiIntentId): string | null {
  switch (intent) {
    case "create_carrier_draft":
      return "create_carrier_draft";
    case "get_carrier_by_code":
      return "find_carrier";
    case "get_all_carriers":
      return "list_carriers";
    case "get_datapoints":
      return "get_datapoints";
    default:
      return null;
  }
}
