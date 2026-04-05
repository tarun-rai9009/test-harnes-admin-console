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
        message: "No carriers on file.",
        summaryLines: [],
      };
    }
    const slice = list.slice(0, MAX_ROWS);
    const table = carrierListToSummaryTable(slice);
    let message: string;
    if (n === 1) {
      message = "1 carrier on file.";
    } else if (n > MAX_ROWS) {
      message = `${n} carriers — showing first ${MAX_ROWS}.`;
    } else {
      message = `${n} carriers.`;
    }
    return {
      message,
      summaryTable: table,
    };
  },
};
