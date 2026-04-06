import { createCarrierDraft } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import type { CreateCarrierDraftPayload } from "@/types/zinnia/carriers";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import {
  buildCreateDraftPayload,
  getCreateCarrierConfirmationRows,
} from "@/lib/workflows/create-carrier-draft-form-utils";
import {
  createCarrierDraftOptionalFields,
  createCarrierDraftRequiredFields,
} from "@/lib/workflows/definitions/create-carrier-draft-workflow-fields";

export {
  buildCreateCarrierDraftFormState,
  buildCreateDraftPayload,
  CREATE_CARRIER_DRAFT_FORM_KEYS,
  CREATE_CARRIER_DRAFT_REQUIRED_KEYS,
  FIELD_ORDER,
  getCreateCarrierConfirmationRows,
  mergeCreateCarrierDraftFormIntoCollected,
  SUMMARY_LABELS,
} from "@/lib/workflows/create-carrier-draft-form-utils";

function formatCarrierSuccess(result: unknown): {
  message: string;
  summaryLines?: string[];
  summaryFields?: { label: string; value: string }[];
  actions?: { label: string; message: string }[];
} {
  const d = result as CarrierDetails & Record<string, unknown>;

  const codeRaw = d.carrierCode;
  const nameRaw = d.carrierName;
  const code =
    typeof codeRaw === "string" && codeRaw.trim()
      ? codeRaw.trim().toUpperCase()
      : "";
  const name =
    typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : "";

  const message = code
    ? `Carrier created successfully with status draft for ${code}${name ? ` (${name})` : ""}.`
    : "Carrier created successfully with status draft.";

  const summaryLines = [message, "Full response below."];

  return {
    message,
    summaryLines,
    actions: [
      { label: "View detail", message: `Lookup by code ${code}` },
      { label: "Add detail", message: `Update carrier ${code}` },
      { label: "Continue", message: "clear" },
    ],
  };
}

export function buildCreateCarrierConfirmationMessage(
  data: Record<string, unknown>,
): string {
  void data;
  return [
    "Review the summary.",
    "Reply **yes** to save, **no** to change.",
  ].join("\n");
}

export const createCarrierDraftWorkflow: WorkflowDefinition = {
  id: "create_carrier_draft",
  userFacingLabel: "New carrier setup",
  requiresConfirmation: true,
  buildConfirmationMessage: buildCreateCarrierConfirmationMessage,
  getConfirmationSummaryRows: getCreateCarrierConfirmationRows,
  requiredFields: createCarrierDraftRequiredFields,
  optionalFields: createCarrierDraftOptionalFields,
  buildPayload: (data) => buildCreateDraftPayload(data),
  execute: (payload) =>
    createCarrierDraft(payload as CreateCarrierDraftPayload),
  formatSuccess: formatCarrierSuccess,
};
