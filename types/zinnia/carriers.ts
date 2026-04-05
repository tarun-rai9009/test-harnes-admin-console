/**
 * Zinnia carrier API — request/response shapes aligned with REST endpoints.
 */

/**
 * POST /carriers/draft — aligned with `openapi.yaml` CreateCarrierDraftRequest.
 * Required: carrierCode, entityType, carrierName, organizationName.
 */
export type CreateCarrierDraftPayload = {
  carrierCode: string;
  entityType: string;
  carrierName: string;
  organizationName: string;
  lineOfBusiness?: string;
  productTypes?: string[];
  ultimateParentCompanyId?: string | null;
  parentCompanyId?: string | null;
  organizationDba?: string | null;
};

/** PUT /carriers/{carrierCode} — nested sections supported by the API. */

export type UpdateCarrierBaseUrls = {
  organizationDomainName?: string;
  carrierLoginUrl?: string;
  agentLoginUrl?: string;
  customerLoginUrl?: string;
};

export type UpdateCarrierBaseIdentifiers = {
  identifierType?: string;
  identifierValue?: string;
};

export type UpdateCarrierBaseRegulatory = {
  foundedYear?: number;
  lineOfBusiness?: string;
  /** OpenAPI: array of state/jurisdiction strings */
  authorizedJurisdictionStates?: string[];
  rating?: string;
  tpaNonTpa?: string;
  /** OpenAPI `YnEnum`: Y | N (not JSON boolean) */
  isC2CRplParticipant?: "Y" | "N";
  use1035YP?: "Y" | "N";
};

export type UpdateCarrierBusinessHoliday = {
  holidayName?: string;
  holidayType?: string;
  dateOrOccurrence?: string;
};

export type UpdateCarrierHoursOfOperation = {
  businessHourStart?: string;
  businessHourEnd?: string;
  businessDays?: string;
  businessHoursTimeZone?: string;
};

export type UpdateCarrierConnectorPair = {
  participantId?: string;
  locationId?: string;
};

export type UpdateCarrierAddress = {
  addressType?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  state?: string;
  addressZipCode?: string;
  addressZipCodeExt?: string;
  addressCountry?: string;
  addressEffectiveDate?: string;
  addressEndDate?: string;
};

export type UpdateCarrierPhone = {
  phoneType?: string;
  countryCode?: string;
  areaCode?: string;
  dialNumber?: string;
  extension?: string;
  phoneEffectiveDate?: string;
  phoneEndDate?: string;
};

export type UpdateCarrierEmail = {
  emailType?: string;
  emailAddress?: string;
  emailEffectiveDate?: string;
  emailEndDate?: string;
};

/** Fields under `base` for PUT /carriers/{carrierCode}. */
export type UpdateCarrierBaseSection = {
  carrierId?: string;
  secondaryCarrierCode?: string;
  entityType?: string;
  carrierName?: string;
  ultimateParentCompanyId?: string;
  parentCompanyId?: string;
  organizationName?: string;
  organizationDba?: string;
  organizationShortName?: string;
  logoAssetReference?: string;
  lineOfBusiness?: string;
  productTypes?: string[];
  urls?: UpdateCarrierBaseUrls;
  /** OpenAPI: array of identifier rows on CarrierBase */
  identifiers?: UpdateCarrierBaseIdentifiers[];
  /** OpenAPI: array of regulatory rows on CarrierBase */
  regulatory?: UpdateCarrierBaseRegulatory[];
  businessHolidays?: UpdateCarrierBusinessHoliday[];
  /** OpenAPI: array of CarrierHoursOfOperation */
  hoursOfOperation?: UpdateCarrierHoursOfOperation[];
};

export type UpdateCarrierConnectorsSection = {
  dtccIds?: UpdateCarrierConnectorPair[];
  c2cConnectedCarriers?: UpdateCarrierConnectorPair[];
};

/**
 * Nested PUT body — only include sections the user changed.
 */
export type UpdateCarrierPayload = {
  base?: UpdateCarrierBaseSection;
  connectors?: UpdateCarrierConnectorsSection;
  addresses?: UpdateCarrierAddress[];
  phones?: UpdateCarrierPhone[];
  emails?: UpdateCarrierEmail[];
};

/** GET /carriers — list row / summary card. */
export type CarrierSummary = {
  carrierCode: string;
  carrierName: string;
  lineOfBusiness?: string;
  entityType?: string;
  status?: string;
  organizationName?: string;
};

/** GET /carriers/{carrierCode} — detail view (superset of summary). */
export type CarrierDetails = CarrierSummary & {
  productTypes?: string[];
  ultimateParentCompanyId?: string;
  parentCompanyId?: string;
  organizationDba?: string;
};

/**
 * GET /carriers/{carrierCode} full body per OpenAPI `CarrierResponse` (nested `base`, contacts, etc.).
 * Used for typing API responses; UI maps unknown fields safely.
 */
export type CarrierGetResponse = CarrierDetails & {
  id?: string;
  version?: string | null;
  status?: string;
  base?: UpdateCarrierBaseSection & {
    /** OpenAPI: array of URL rows; some payloads may send a single object */
    urls?: UpdateCarrierBaseUrls | UpdateCarrierBaseUrls[];
  };
  connectors?: UpdateCarrierConnectorsSection;
  addresses?: UpdateCarrierAddress[];
  phones?: UpdateCarrierPhone[];
  emails?: UpdateCarrierEmail[];
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

/** Raw list response if the API wraps the array (normalize in the client). */
export type CarrierListApiResponse =
  | CarrierSummary[]
  | { carriers?: CarrierSummary[]; items?: CarrierSummary[]; data?: CarrierSummary[] };

export function normalizeCarrierListResponse(
  raw: CarrierListApiResponse,
): CarrierSummary[] {
  if (Array.isArray(raw)) return raw;
  return raw.carriers ?? raw.items ?? raw.data ?? [];
}
