/**
 * Field definitions for create-carrier draft — no Zinnia (safe to import from client bundles).
 */

import { SUMMARY_LABELS } from "@/lib/workflows/create-carrier-draft-form-utils";
import type { WorkflowFieldDefinition } from "@/lib/workflows/workflow-types";
import {
  validateCarrierCode,
  validateDraftNameString,
  validateEntityTypeOpenApi,
  validateOptionalLineOfBusinessOpenApi,
  validateOptionalOrganizationDbaOpenApi,
  validateOptionalParentCompanyId,
  validateOptionalProductTypesOpenApi,
} from "@/lib/workflows/validators";

export const createCarrierDraftRequiredFields: WorkflowFieldDefinition[] = [
  {
    key: "carrierCode",
    required: true,
    summaryLabel: SUMMARY_LABELS.carrierCode,
    businessPrompt: "**Carrier code** — 4 letters or numbers (e.g. A1B2).",
    validate: validateCarrierCode,
  },
  {
    key: "carrierName",
    required: true,
    summaryLabel: SUMMARY_LABELS.carrierName,
    businessPrompt: "Carrier **display name**?",
    validate: validateDraftNameString("the carrier name"),
  },
  {
    key: "entityType",
    required: true,
    summaryLabel: SUMMARY_LABELS.entityType,
    businessPrompt:
      "**Entity type** (e.g. Corporation, LLC — must match allowed list).",
    validate: validateEntityTypeOpenApi,
  },
  {
    key: "organizationName",
    required: true,
    summaryLabel: SUMMARY_LABELS.organizationName,
    businessPrompt: "**Legal organization name**?",
    validate: validateDraftNameString("the organization name"),
  },
];

export const createCarrierDraftOptionalFields: WorkflowFieldDefinition[] = [
  {
    key: "organizationDba",
    required: false,
    summaryLabel: SUMMARY_LABELS.organizationDba,
    businessPrompt: "Optional **DBA**, or **skip**.",
    validate: validateOptionalOrganizationDbaOpenApi(),
  },
  {
    key: "lineOfBusiness",
    required: false,
    summaryLabel: SUMMARY_LABELS.lineOfBusiness,
    businessPrompt: "Optional **line of business** (e.g. P&C), or **skip**.",
    validate: validateOptionalLineOfBusinessOpenApi(),
  },
  {
    key: "productTypes",
    required: false,
    summaryLabel: SUMMARY_LABELS.productTypes,
    businessPrompt: "Optional **product types** (comma-separated), or **skip**.",
    validate: validateOptionalProductTypesOpenApi(),
  },
  {
    key: "ultimateParentCompanyId",
    required: false,
    summaryLabel: SUMMARY_LABELS.ultimateParentCompanyId,
    businessPrompt: "Optional **ultimate parent** ID, or **skip**.",
    validate: validateOptionalParentCompanyId(
      "the ultimate parent company reference",
    ),
  },
  {
    key: "parentCompanyId",
    required: false,
    summaryLabel: SUMMARY_LABELS.parentCompanyId,
    businessPrompt: "Optional **parent company** ID, or **skip**.",
    validate: validateOptionalParentCompanyId(
      "the parent company reference",
    ),
  },
];
