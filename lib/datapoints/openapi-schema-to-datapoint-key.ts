/**
 * Map OpenAPI enum schema names (used in carrier forms) to Zinnia GET /datapoints keys.
 * Keys follow OpenAPI DataPointsEnum-style SCREAMING_SNAKE names.
 */

import type { OpenApiEnumSchemaName } from "@/types/zinnia/generated/openapi-enums";

export const OPENAPI_ENUM_SCHEMA_TO_DATAPOINT_KEY: Record<
  OpenApiEnumSchemaName,
  string
> = {
  AddressTypeEnum: "ADDRESS_TYPE",
  CountryCodeEnum: "COUNTRY_CODE",
  EmailTypeEnum: "EMAIL_TYPE",
  EntityTypeEnum: "ENTITY_TYPE",
  HolidayTypeEnum: "HOLIDAY_TYPE",
  IdentifierTypeEnum: "IDENTIFIER_TYPE",
  LineOfBusinessEnum: "LINE_OF_BUSINESS",
  PhoneTypeEnum: "PHONE_TYPE",
  ProductTypeEnum: "PRODUCT_TYPE",
  RatingEnum: "RATING",
  StatusEnum: "STATUS",
  TpaNonTpaEnum: "TPA_NON_TPA",
  YnEnum: "YN",
};

export function datapointKeyForOpenApiSchema(
  schema: OpenApiEnumSchemaName,
): string {
  return OPENAPI_ENUM_SCHEMA_TO_DATAPOINT_KEY[schema];
}
