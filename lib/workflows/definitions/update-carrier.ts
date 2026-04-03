import { updateCarrier } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import { carrierDetailsToSummaryFields } from "@/lib/workflows/carrier-summary-fields";
import { UPDATE_CARRIER_FIELD_GROUPS } from "@/lib/workflows/definitions/update-carrier-catalog";
import {
  buildUpdateConfirmationRowsFromData,
  collectedParamsToUpdatePayload,
  updatePayloadHasBody,
} from "@/lib/workflows/definitions/update-carrier-payload";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";

function buildUpdateConfirmationMessage(): string {
  return [
    "Here’s a recap of what we’re about to save.",
    "",
    "If everything looks right, reply yes and I’ll apply it. If not, reply no and we’ll adjust.",
  ].join("\n");
}

export const updateCarrierWorkflow: WorkflowDefinition = {
  id: "update_carrier",
  userFacingLabel: "Carrier update",
  requiresConfirmation: true,
  requiredFields: [],
  optionalFields: [],
  fieldGroups: UPDATE_CARRIER_FIELD_GROUPS,
  buildConfirmationMessage: () => buildUpdateConfirmationMessage(),
  getConfirmationSummaryRows: (data) => buildUpdateConfirmationRowsFromData(data),
  buildPayload: (data) => {
    const putPayload = collectedParamsToUpdatePayload(data);
    return {
      carrierCode: data.carrierCode as string,
      putPayload,
    };
  },
  execute: async (payload) => {
    const { carrierCode, putPayload } = payload as {
      carrierCode: string;
      putPayload: ReturnType<typeof collectedParamsToUpdatePayload>;
    };
    if (!updatePayloadHasBody(putPayload)) {
      throw new Error("No update fields were provided.");
    }
    return updateCarrier(carrierCode, putPayload);
  },
  formatSuccess: (result) => {
    const d = result as CarrierDetails;
    const name = d.carrierName?.trim() || "this carrier";
    const code = d.carrierCode?.trim() || "";
    const who = code ? `${name} (${code})` : name;
    return {
      message: `Done — your updates for ${who} are saved.`,
      summaryFields: carrierDetailsToSummaryFields(d),
    };
  },
};

export { updateCarrierHasCategoryChanges as updateCarrierHasChanges } from "@/lib/workflows/definitions/update-carrier-payload";
export {
  getUpdateCarrierNoChangesMessage,
  getUpdateCarrierOptionalIntro,
} from "@/lib/workflows/definitions/update-carrier-catalog";
