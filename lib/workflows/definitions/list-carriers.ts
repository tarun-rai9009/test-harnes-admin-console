import { getAllCarriers } from "@/lib/zinnia/carriers";
import type { CarrierSummary } from "@/types/zinnia/carriers";
import { carrierListToSummaryTable } from "@/lib/workflows/carrier-summary-fields";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";

export const listCarriersWorkflow: WorkflowDefinition = {
  id: "list_carriers",
  userFacingLabel: "Carrier list",
  requiresConfirmation: false,
  requiredFields: [],
  optionalFields: [],
  buildPayload: () => ({}),
  execute: async () => getAllCarriers(),
  formatSuccess: (result) => {
    const list = result as CarrierSummary[];
    const n = list.length;
    const MAX_ROWS = 50;
    if (n === 0) {
      return {
        message:
          "There aren’t any carriers on file yet. Once you add carriers, they’ll appear in this list.",
        summaryLines: [],
      };
    }
    const slice = list.slice(0, MAX_ROWS);
    const table = carrierListToSummaryTable(slice);
    let message: string;
    if (n === 1) {
      message = "Here’s the carrier currently on file.";
    } else if (n > MAX_ROWS) {
      message = `You have ${n} carriers on file. I’m showing the first ${MAX_ROWS} below so the list stays easy to scan.`;
    } else {
      message = `Here are your ${n} carriers on file.`;
    }
    return {
      message,
      summaryTable: table,
    };
  },
};
