/**
 * Enum values from `openapi.yaml` — sourced from generated `OPENAPI_ENUMS`.
 * Regenerate enums: `npm run generate:openapi-enums`
 */

import {
  OPENAPI_ENUMS,
  type OpenApiEnumSchemaName,
} from "@/types/zinnia/generated/openapi-enums";

export { OPENAPI_ENUMS, type OpenApiEnumSchemaName };

export const ENTITY_TYPE_VALUES = OPENAPI_ENUMS.EntityTypeEnum;
export const LINE_OF_BUSINESS_VALUES = OPENAPI_ENUMS.LineOfBusinessEnum;
export const PRODUCT_TYPE_VALUES = OPENAPI_ENUMS.ProductTypeEnum;

export type EntityTypeEnum = (typeof ENTITY_TYPE_VALUES)[number];
export type LineOfBusinessEnum = (typeof LINE_OF_BUSINESS_VALUES)[number];
export type ProductTypeEnum = (typeof PRODUCT_TYPE_VALUES)[number];
