/**
 * AUTO-GENERATED from openapi.yaml — do not edit by hand.
 * Regenerate: `npm run generate:openapi-enums`
 */

export const OPENAPI_ENUMS = {
  AddressTypeEnum: [
    "Primary",
    "Mailing",
    "Physical",
    "Billing",
    "Registered",
    "Headquarters",
    "Remittance",
    "Branch"
  ] as const,
  CountryCodeEnum: [
    "US",
    "CA",
    "MX",
    "GB",
    "IN",
    "AU",
    "Other"
  ] as const,
  EmailTypeEnum: [
    "Primary",
    "Support",
    "Claims",
    "Billing",
    "Service",
    "Escalation",
    "Operations",
    "Other"
  ] as const,
  EntityTypeEnum: [
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
    "Unknown"
  ] as const,
  HolidayTypeEnum: [
    "Fixed Date",
    "Floating",
    "Observed",
    "Ad Hoc"
  ] as const,
  IdentifierTypeEnum: [
    "NAIC Number",
    "TAX ID",
    "EIN",
    "PAYORID",
    "CUSIP",
    "LEI",
    "REGISTRATIONNUMBER"
  ] as const,
  LineOfBusinessEnum: [
    "Life",
    "Annuity",
    "Health",
    "P&C",
    "Disability",
    "Long Term Care",
    "Retirement",
    "Worksite Benefits",
    "Other"
  ] as const,
  PhoneTypeEnum: [
    "Main",
    "Work",
    "Mobile",
    "Fax",
    "Toll Free",
    "Support",
    "Claims",
    "Billing",
    "Escalation",
    "Other"
  ] as const,
  ProductTypeEnum: [
    "Term Life",
    "Whole Life",
    "Universal Life",
    "Variable Annuity",
    "Fixed Annuity"
  ] as const,
  RatingEnum: [
    "A++",
    "A+",
    "A",
    "A-",
    "B++",
    "B+",
    "B",
    "B-",
    "C++",
    "C+",
    "C",
    "C-",
    "D",
    "E",
    "F",
    "NR"
  ] as const,
  StatusEnum: [
    "DRAFT",
    "PUBLISHED"
  ] as const,
  TpaNonTpaEnum: [
    "TPA",
    "Non TPA"
  ] as const,
  YnEnum: [
    "Y",
    "N"
  ] as const,
} as const;

export type OpenApiEnumSchemaName = keyof typeof OPENAPI_ENUMS;

