/**
 * Maps carrier form field keys (create + update) to OpenAPI enum schema names.
 * Values come from generated OPENAPI_ENUMS; this table is the only hand-maintained
 * wiring when new form fields are added.
 */

import type { OpenApiEnumSchemaName } from "@/types/zinnia/generated/openapi-enums";

export type CarrierFormEnumMode = "single" | "multi";

export type CarrierFormEnumBinding = {
  schema: OpenApiEnumSchemaName;
  mode: CarrierFormEnumMode;
};

/** Create draft + update section keys that use an OpenAPI enum in the carrier API. */
export const CARRIER_FORM_FIELD_ENUM: Record<string, CarrierFormEnumBinding> = {
  entityType: { schema: "EntityTypeEnum", mode: "single" },
  lineOfBusiness: { schema: "LineOfBusinessEnum", mode: "single" },
  productTypes: { schema: "ProductTypeEnum", mode: "multi" },
  basic_entityType: { schema: "EntityTypeEnum", mode: "single" },
  basic_lineOfBusiness: { schema: "LineOfBusinessEnum", mode: "single" },
  basic_productTypes: { schema: "ProductTypeEnum", mode: "multi" },
  id_identifierType: { schema: "IdentifierTypeEnum", mode: "single" },
  reg_lineOfBusiness: { schema: "LineOfBusinessEnum", mode: "single" },
  reg_rating: { schema: "RatingEnum", mode: "single" },
  reg_tpaNonTpa: { schema: "TpaNonTpaEnum", mode: "single" },
  reg_isC2CRplParticipant: { schema: "YnEnum", mode: "single" },
  reg_use1035YP: { schema: "YnEnum", mode: "single" },
  hol_holidayType: { schema: "HolidayTypeEnum", mode: "single" },
  addr_addressType: { schema: "AddressTypeEnum", mode: "single" },
  addr_addressCountry: { schema: "CountryCodeEnum", mode: "single" },
  phone_phoneType: { schema: "PhoneTypeEnum", mode: "single" },
  em_emailType: { schema: "EmailTypeEnum", mode: "single" },
};

export function getCarrierFormEnumBinding(
  fieldKey: string,
): CarrierFormEnumBinding | undefined {
  return CARRIER_FORM_FIELD_ENUM[fieldKey];
}
