import { getDatapoints } from "@/lib/zinnia/carriers";
import type { DatapointResponse } from "@/types/zinnia/datapoints";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";

const MAX_ROWS = 40;

export const showDatapointsWorkflow: WorkflowDefinition = {
  id: "get_datapoints",
  userFacingLabel: "Reference list",
  requiresConfirmation: false,
  requiredFields: [],
  optionalFields: [],
  buildPayload: () => ({}),
  execute: async () => getDatapoints(),
  formatSuccess: (result) => {
    const r = result as DatapointResponse;
    const items = r.items ?? [];
    const n = items.length;
    if (n === 0) {
      return {
        message:
          "The reference list is empty right now. If you expected values here, your administrator can help confirm when they’re loaded.",
        summaryLines: [],
      };
    }
    const slice = items.slice(0, MAX_ROWS);
    const columns = [
      { id: "label", label: "Name" },
      { id: "code", label: "Code" },
    ];
    const rows = slice.map((d) => {
      const label = String(
        d.label ?? d.name ?? d.description ?? "—",
      ).trim();
      const code = d.code != null && String(d.code).trim() !== ""
        ? String(d.code)
        : "—";
      return { label: label || "—", code };
    });
    const message =
      n > MAX_ROWS
        ? `Here are ${n} reference values for forms and dropdowns. I’m showing the first ${MAX_ROWS} so it’s easy to read.`
        : `Here are ${n} reference values you can use when filling out forms.`;
    return {
      message,
      summaryTable: { columns, rows },
    };
  },
};
