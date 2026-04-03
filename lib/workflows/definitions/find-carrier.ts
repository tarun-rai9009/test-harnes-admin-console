import { getCarrierByCode } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import { carrierDetailsToSummaryFields } from "@/lib/workflows/carrier-summary-fields";
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
  const headline = code
    ? `Here’s what we have on file for ${name} (carrier code ${code}).`
    : `Here’s what we have on file for ${name}.`;
  return {
    message: headline,
    summaryFields: carrierDetailsToSummaryFields(d),
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
      businessPrompt:
        "Which carrier code should I look up? You can type the code your team normally uses.",
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
