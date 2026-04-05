/**
 * Enum values from project `openapi.yaml` (CreateCarrierDraftRequest + path params).
 * Keep in sync when regenerating from OpenAPI.
 */

export const ENTITY_TYPE_VALUES = [
  "Sole Proprietorship",
  "General Partnership",
  "Limited Partnership",
  "C Corporation",
  "S Corporation",
  "Limited Liability Company",
  "Charitable Organization",
  "E State",
  "Trust",
  "Corporation",
  "Insurance Company",
  "Unknown",
] as const;

export const LINE_OF_BUSINESS_VALUES = [
  "Life",
  "Annuity",
  "Health",
  "P&C",
  "Disability",
  "Long Term Care",
  "Retirement",
  "Worksite Benefits",
  "Other",
] as const;

export const PRODUCT_TYPE_VALUES = [
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Variable Annuity",
  "Fixed Annuity",
] as const;

export type EntityTypeEnum = (typeof ENTITY_TYPE_VALUES)[number];
export type LineOfBusinessEnum = (typeof LINE_OF_BUSINESS_VALUES)[number];
export type ProductTypeEnum = (typeof PRODUCT_TYPE_VALUES)[number];
