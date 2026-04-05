import { getCarrierByCode } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import { carrierLookupBriefSummaryFields } from "@/lib/workflows/carrier-summary-fields";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { validateCarrierCode } from "@/lib/workflows/validators";

function formatFindSuccess(result: unknown): {
  message: string;
  summaryLines?: string[];
  summaryFields?: { label: string; value: string }[];
} {
  const d = result as CarrierDetails;
  const name = d.carrierName?.trim() || "this carrier";
  const code = d.carrierCode?.trim() || "";
  const headline = code ? `${name} (${code}).` : `${name}.`;
  return {
    message: headline,
    summaryFields: carrierLookupBriefSummaryFields(d),
  };
}

export const findCarrierWorkflow: WorkflowDefinition = {
  id: "find_carrier",
  userFacingLabel: "Carrier lookup",
  requiresConfirmation: false,
  requiredFields: [
    {
      key: "carrierCode",
      required: true,
      summaryLabel: "Carrier Code",
      businessPrompt: "Which carrier code? (4 characters)",
      validate: validateCarrierCode,
    },
  ],
  optionalFields: [],
  buildPayload: (data) => ({ carrierCode: data.carrierCode as string }),
  execute: async (payload) => {
    const { carrierCode } = payload as { carrierCode: string };
    return getCarrierByCode(carrierCode);
  },
  formatSuccess: formatFindSuccess,
};
