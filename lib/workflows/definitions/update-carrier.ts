import { updateCarrier } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import { UPDATE_CARRIER_FIELD_GROUPS } from "@/lib/workflows/definitions/update-carrier-catalog";
import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import { UPDATE_CATEGORY_ORDER } from "@/lib/workflows/definitions/update-carrier-constants";
import {
  buildUpdateConfirmationRowsFromData,
  buildUpdateConfirmationRowsFromMultiCategoryData,
  collectedParamsToMergedUpdatePayload,
  collectedParamsToUpdatePayload,
  updatePayloadHasBody,
} from "@/lib/workflows/definitions/update-carrier-payload";
import { isUpdateCategoryId } from "@/lib/workflows/update-carrier-section-form";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";

function buildUpdateConfirmationMessage(): string {
  return ["Review the summary.", "Reply **yes** to apply, **no** to edit."].join(
    "\n",
  );
}

export const updateCarrierWorkflow: WorkflowDefinition = {
  id: "update_carrier",
  userFacingLabel: "Carrier update",
  requiresConfirmation: true,
  requiredFields: [],
  optionalFields: [],
  fieldGroups: UPDATE_CARRIER_FIELD_GROUPS,
  buildConfirmationMessage: () => buildUpdateConfirmationMessage(),
  getConfirmationSummaryRows: (data) => {
    const uc = data.updateCategories;
    if (
      Array.isArray(uc) &&
      uc.length > 0 &&
      uc.every(
        (x): x is string => typeof x === "string" && isUpdateCategoryId(x),
      )
    ) {
      const ordered = UPDATE_CATEGORY_ORDER.filter((c) =>
        (uc as UpdateCategoryId[]).includes(c),
      );
      return buildUpdateConfirmationRowsFromMultiCategoryData(data, ordered);
    }
    return buildUpdateConfirmationRowsFromData(data);
  },
  buildPayload: (data) => {
    const uc = data.updateCategories;
    if (
      Array.isArray(uc) &&
      uc.length > 0 &&
      uc.every(
        (x): x is string => typeof x === "string" && isUpdateCategoryId(x),
      )
    ) {
      const ordered = UPDATE_CATEGORY_ORDER.filter((c) =>
        (uc as UpdateCategoryId[]).includes(c),
      );
      const putPayload = collectedParamsToMergedUpdatePayload(data, ordered);
      return {
        carrierCode: data.carrierCode as string,
        putPayload,
      };
    }
    const putPayload = collectedParamsToUpdatePayload(data);
    return {
      carrierCode: data.carrierCode as string,
      putPayload,
    };
  },
  execute: async (payload) => {
    const { carrierCode, putPayload } = payload as {
      carrierCode: string;
      putPayload: ReturnType<
        typeof collectedParamsToUpdatePayload | typeof collectedParamsToMergedUpdatePayload
      >;
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
      message: `Saved: ${who}.`,
      summaryFields: [
        { label: "Carrier code", value: code || "—" },
        { label: "Carrier name", value: name },
      ],
    };
  },
};

export { updateCarrierHasCategoryChanges as updateCarrierHasChanges } from "@/lib/workflows/definitions/update-carrier-payload";
export {
  getUpdateCarrierNoChangesMessage,
  getUpdateCarrierOptionalIntro,
} from "@/lib/workflows/definitions/update-carrier-catalog";
