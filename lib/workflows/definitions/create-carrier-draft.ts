import { createCarrierDraft } from "@/lib/zinnia/carriers";
import type { CarrierDetails } from "@/types/zinnia/carriers";
import type { CreateCarrierDraftPayload } from "@/types/zinnia/carriers";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import {
  validateCarrierCode,
  validateProductTypes,
  validateRequiredString,
} from "@/lib/workflows/validators";

const FIELD_ORDER = [
  "carrierCode",
  "carrierName",
  "entityType",
  "organizationName",
  "organizationDba",
  "lineOfBusiness",
  "productTypes",
  "ultimateParentCompanyId",
  "parentCompanyId",
] as const;

/** Labels for confirmation + success summary cards (business-facing, title case). */
const SUMMARY_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  carrierCode: "Carrier Code",
  carrierName: "Carrier Name",
  entityType: "Entity Type",
  organizationName: "Organization Name",
  organizationDba: "DBA",
  lineOfBusiness: "Line of Business",
  productTypes: "Product Types",
  ultimateParentCompanyId: "Ultimate Parent Company ID",
  parentCompanyId: "Parent Company ID",
};

function buildCreateDraftPayload(
  data: Record<string, unknown>,
): CreateCarrierDraftPayload {
  return {
    lineOfBusiness: data.lineOfBusiness as string,
    productTypes: data.productTypes as string[],
    carrierCode: data.carrierCode as string,
    ultimateParentCompanyId: data.ultimateParentCompanyId as string,
    parentCompanyId: data.parentCompanyId as string,
    entityType: data.entityType as string,
    carrierName: data.carrierName as string,
    organizationName: data.organizationName as string,
    organizationDba: data.organizationDba as string,
  };
}

function formatValueForSummary(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

export function getCreateCarrierConfirmationRows(
  data: Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const key of FIELD_ORDER) {
    const label = SUMMARY_LABELS[key];
    const raw = data[key];
    rows.push({ label, value: formatValueForSummary(raw) });
  }
  return rows;
}

export function buildCreateCarrierConfirmationMessage(
  data: Record<string, unknown>,
): string {
  void data;
  return [
    "I have everything I need to create this carrier draft.",
    "",
    "Take a look at the summary next to this message. If it looks right, reply yes and I’ll save it. If something’s off, reply no and we’ll fix it together.",
  ].join("\n");
}

/**
 * Status and a single best identifier from the backend (no raw payload dump).
 */
function pickBackendStatusAndId(
  d: CarrierDetails & Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const status =
    d.status ??
    (typeof d.draftStatus === "string" ? d.draftStatus : undefined);
  if (status !== undefined && status !== null && String(status).trim() !== "") {
    rows.push({ label: "Status", value: String(status) });
  }
  const idKeys = [
    "id",
    "draftId",
    "carrierId",
    "referenceId",
    "uuid",
  ] as const;
  for (const key of idKeys) {
    const v = d[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      rows.push({ label: "Record ID", value: String(v) });
      break;
    }
  }
  return rows;
}

function formatCarrierSuccess(result: unknown): {
  message: string;
  summaryLines?: string[];
  summaryFields?: { label: string; value: string }[];
} {
  const d = result as CarrierDetails & Record<string, unknown>;

  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.map(String).join(", ");
    return String(v);
  };

  const coreFields: { label: string; value: string }[] = [
    { label: SUMMARY_LABELS.carrierCode, value: fmt(d.carrierCode) },
    { label: SUMMARY_LABELS.carrierName, value: fmt(d.carrierName) },
    { label: SUMMARY_LABELS.entityType, value: fmt(d.entityType) },
    { label: SUMMARY_LABELS.organizationName, value: fmt(d.organizationName) },
    { label: SUMMARY_LABELS.organizationDba, value: fmt(d.organizationDba) },
    { label: SUMMARY_LABELS.lineOfBusiness, value: fmt(d.lineOfBusiness) },
    { label: SUMMARY_LABELS.productTypes, value: fmt(d.productTypes) },
    {
      label: SUMMARY_LABELS.ultimateParentCompanyId,
      value: fmt(d.ultimateParentCompanyId),
    },
    { label: SUMMARY_LABELS.parentCompanyId, value: fmt(d.parentCompanyId) },
  ];

  const meta = pickBackendStatusAndId(d);
  const summaryFields = [...coreFields, ...meta];

  const message =
    "All set — the new carrier draft is saved. Here’s a recap of what we recorded.";

  return {
    message,
    summaryLines: summaryFields.map((r) => `${r.label}: ${r.value}`),
    summaryFields,
  };
}

export const createCarrierDraftWorkflow: WorkflowDefinition = {
  id: "create_carrier_draft",
  userFacingLabel: "New carrier setup",
  requiresConfirmation: true,
  buildConfirmationMessage: buildCreateCarrierConfirmationMessage,
  getConfirmationSummaryRows: getCreateCarrierConfirmationRows,
  requiredFields: [
    {
      key: "carrierCode",
      required: true,
      summaryLabel: SUMMARY_LABELS.carrierCode,
      businessPrompt:
        "What carrier code should we use? This is the short internal reference your team will use to find this carrier (letters and numbers are fine).",
      validate: validateCarrierCode,
    },
    {
      key: "carrierName",
      required: true,
      summaryLabel: SUMMARY_LABELS.carrierName,
      businessPrompt:
        "What is the carrier’s display name — the name people should see on documents and screens?",
      validate: validateRequiredString("the carrier name"),
    },
    {
      key: "entityType",
      required: true,
      summaryLabel: SUMMARY_LABELS.entityType,
      businessPrompt:
        "What type of legal entity is this carrier (for example corporation, LLC, or partnership)?",
      validate: validateRequiredString("the entity type"),
    },
    {
      key: "organizationName",
      required: true,
      summaryLabel: SUMMARY_LABELS.organizationName,
      businessPrompt:
        "What is the full legal name of the organization behind this carrier?",
      validate: validateRequiredString("the organization name"),
    },
    {
      key: "organizationDba",
      required: true,
      summaryLabel: SUMMARY_LABELS.organizationDba,
      businessPrompt:
        "What doing-business-as (DBA) name should we show when it’s different from the legal name?",
      validate: validateRequiredString("the DBA name"),
    },
    {
      key: "lineOfBusiness",
      required: true,
      summaryLabel: SUMMARY_LABELS.lineOfBusiness,
      businessPrompt:
        "Which line of business does this carrier belong to (for example property, casualty, or specialty)?",
      validate: validateRequiredString("the line of business"),
    },
    {
      key: "productTypes",
      required: true,
      summaryLabel: SUMMARY_LABELS.productTypes,
      businessPrompt:
        "Which product types should be included? You can list several separated by commas (for example homeowners, auto, umbrella).",
      validate: validateProductTypes,
    },
    {
      key: "ultimateParentCompanyId",
      required: true,
      summaryLabel: SUMMARY_LABELS.ultimateParentCompanyId,
      businessPrompt:
        "What reference should we use for the ultimate parent company (the top-level company in the group)? Use the same identifier your organization already uses for that company.",
      validate: validateRequiredString("the ultimate parent company reference"),
    },
    {
      key: "parentCompanyId",
      required: true,
      summaryLabel: SUMMARY_LABELS.parentCompanyId,
      businessPrompt:
        "What reference should we use for the immediate parent company — the direct parent of this carrier?",
      validate: validateRequiredString("the parent company reference"),
    },
  ],
  optionalFields: [],
  buildPayload: (data) => buildCreateDraftPayload(data),
  execute: (payload) =>
    createCarrierDraft(payload as CreateCarrierDraftPayload),
  formatSuccess: formatCarrierSuccess,
};
