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
    const refKeys = Object.keys(r.referenceByKey ?? {});
    const n = items.length;
    if (n === 0 && refKeys.length > 0) {
      const totalEntries = refKeys.reduce(
        (acc, k) =>
          acc + Object.keys(r.referenceByKey![k] ?? {}).length,
        0,
      );
      return {
        message: `${refKeys.length} datapoint groups (${totalEntries} values).`,
        summaryLines: refKeys.slice(0, 20).map((k) => `• ${k}`),
      };
    }
    if (n === 0) {
      return {
        message: "Reference list is empty.",
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
        ? `${n} reference values — showing first ${MAX_ROWS}.`
        : `${n} reference values.`;
    return {
      message,
      summaryTable: { columns, rows },
    };
  },
};
