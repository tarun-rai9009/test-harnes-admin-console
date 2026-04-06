/**
 * Map Zinnia ValidationErrorResponse `field` paths (e.g. base.regulatory[0].rating)
 * to flat update-carrier collected keys (e.g. reg_rating).
 */

/** Normalize JSON Pointer-ish paths for matching. */
export function normalizeZinniaFieldPath(path: string): string {
  return path
    .replace(/^\$\.?/, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

const REGULATORY_LEAF: Record<string, string> = {
  foundedYear: "reg_foundedYear",
  lineOfBusiness: "reg_lineOfBusiness",
  authorizedJurisdictionStates: "reg_authorizedJurisdictionStates",
  rating: "reg_rating",
  tpaNonTpa: "reg_tpaNonTpa",
  isC2CRplParticipant: "reg_isC2CRplParticipant",
  use1035YP: "reg_use1035YP",
};

const URL_LEAF: Record<string, string> = {
  organizationDomainName: "url_organizationDomainName",
  carrierLoginUrl: "url_carrierLoginUrl",
  agentLoginUrl: "url_agentLoginUrl",
  customerLoginUrl: "url_customerLoginUrl",
};

const ID_LEAF: Record<string, string> = {
  identifierType: "id_identifierType",
  identifierValue: "id_identifierValue",
};

const HOL_LEAF: Record<string, string> = {
  holidayName: "hol_holidayName",
  holidayType: "hol_holidayType",
  dateOrOccurrence: "hol_dateOrOccurrence",
};

const HRS_LEAF: Record<string, string> = {
  businessHourStart: "hrs_businessHourStart",
  businessHourEnd: "hrs_businessHourEnd",
  businessDays: "hrs_businessDays",
  businessHoursTimeZone: "hrs_businessHoursTimeZone",
};

const BASIC_LEAF: Record<string, string> = {
  carrierId: "basic_carrierId",
  secondaryCarrierCode: "basic_secondaryCarrierCode",
  entityType: "basic_entityType",
  carrierName: "basic_carrierName",
  lineOfBusiness: "basic_lineOfBusiness",
  productTypes: "basic_productTypes",
};

const ORG_LEAF: Record<string, string> = {
  ultimateParentCompanyId: "org_ultimateParentCompanyId",
  parentCompanyId: "org_parentCompanyId",
  organizationName: "org_organizationName",
  organizationDba: "org_organizationDba",
  organizationShortName: "org_organizationShortName",
  logoAssetReference: "org_logoAssetReference",
};

const ADDR_LEAF: Record<string, string> = {
  addressType: "addr_addressType",
  addressLine1: "addr_addressLine1",
  addressLine2: "addr_addressLine2",
  addressLine3: "addr_addressLine3",
  city: "addr_city",
  state: "addr_state",
  addressZipCode: "addr_addressZipCode",
  addressZipCodeExt: "addr_addressZipCodeExt",
  addressCountry: "addr_addressCountry",
  addressEffectiveDate: "addr_addressEffectiveDate",
  addressEndDate: "addr_addressEndDate",
};

const PHONE_LEAF: Record<string, string> = {
  phoneType: "phone_phoneType",
  countryCode: "phone_countryCode",
  areaCode: "phone_areaCode",
  dialNumber: "phone_dialNumber",
  extension: "phone_extension",
  phoneEffectiveDate: "phone_phoneEffectiveDate",
  phoneEndDate: "phone_phoneEndDate",
};

const EMAIL_LEAF: Record<string, string> = {
  emailType: "em_emailType",
  emailAddress: "em_emailAddress",
  emailEffectiveDate: "em_emailEffectiveDate",
  emailEndDate: "em_emailEndDate",
};

function leafAfterPrefix(norm: string, prefix: string): string | undefined {
  if (!norm.startsWith(prefix)) return undefined;
  return norm.slice(prefix.length).replace(/^\./, "");
}

/**
 * Returns the update form field key for this API path, or undefined if unknown.
 */
export function zinniaFieldPathToUpdateFormKey(fieldPath: string): string | undefined {
  const norm = normalizeZinniaFieldPath(fieldPath);
  if (!norm) return undefined;

  let rest = leafAfterPrefix(norm, "base.regulatory");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return REGULATORY_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "base.urls");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return URL_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "base.identifiers");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return ID_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "base.businessHolidays");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return HOL_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "base.hoursOfOperation");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return HRS_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "base");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    if (BASIC_LEAF[leaf]) return BASIC_LEAF[leaf];
    if (ORG_LEAF[leaf]) return ORG_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "addresses");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return ADDR_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "phones");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return PHONE_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "emails");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    return EMAIL_LEAF[leaf];
  }

  rest = leafAfterPrefix(norm, "connectors.dtccIds");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    if (leaf === "participantId") return "conn_dtcc_participantId";
    if (leaf === "locationId") return "conn_dtcc_locationId";
  }

  rest = leafAfterPrefix(norm, "connectors.c2cConnectedCarriers");
  if (rest !== undefined) {
    const leaf = rest.split(".").pop() ?? rest;
    if (leaf === "participantId") return "conn_c2c_participantId";
    if (leaf === "locationId") return "conn_c2c_locationId";
  }

  return undefined;
}

/**
 * Parse indexed multi-entry API paths (before bracket stripping) into a row index
 * and the same flat form keys as single-entry mapping (e.g. id_identifierValue).
 */
export function zinniaMultiEntryPathToRowAndFormKey(
  fieldPath: string,
): { rowIndex: number; formKey: string } | undefined {
  const p = fieldPath.replace(/^\$\.?/, "").trim();
  const patterns: { re: RegExp; leaf: Record<string, string> }[] = [
    { re: /^base\.identifiers\[(\d+)\]\.([a-zA-Z]+)$/, leaf: ID_LEAF },
    { re: /^addresses\[(\d+)\]\.([a-zA-Z]+)$/, leaf: ADDR_LEAF },
    { re: /^phones\[(\d+)\]\.([a-zA-Z]+)$/, leaf: PHONE_LEAF },
    { re: /^emails\[(\d+)\]\.([a-zA-Z]+)$/, leaf: EMAIL_LEAF },
  ];
  for (const { re, leaf } of patterns) {
    const m = p.match(re);
    if (!m) continue;
    const rowIndex = Number(m[1]);
    if (!Number.isInteger(rowIndex) || rowIndex < 0) continue;
    const prop = m[2];
    const formKey = leaf[prop];
    if (formKey === undefined) continue;
    return { rowIndex, formKey };
  }
  return undefined;
}
