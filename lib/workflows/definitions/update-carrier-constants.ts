/** Stable ids for “what to update” — kept in sync with user-facing category list. */

export const UPDATE_CATEGORY_ORDER = [
  "basic_details",
  "org_hierarchy",
  "urls",
  "identifiers",
  "regulatory",
  "business_holidays",
  "hours_operation",
  "connectors",
  "addresses",
  "phones",
  "emails",
] as const;

export type UpdateCategoryId = (typeof UPDATE_CATEGORY_ORDER)[number];

/** Flat collected keys per category (for “at least one change” + confirmation). */
export const UPDATE_CATEGORY_FIELD_KEYS: Record<UpdateCategoryId, string[]> = {
  basic_details: [
    "basic_carrierId",
    "basic_secondaryCarrierCode",
    "basic_entityType",
    "basic_carrierName",
    "basic_lineOfBusiness",
    "basic_productTypes",
  ],
  org_hierarchy: [
    "org_ultimateParentCompanyId",
    "org_parentCompanyId",
    "org_organizationName",
    "org_organizationDba",
    "org_organizationShortName",
    "org_logoAssetReference",
  ],
  urls: [
    "url_organizationDomainName",
    "url_carrierLoginUrl",
    "url_agentLoginUrl",
    "url_customerLoginUrl",
  ],
  identifiers: ["id_identifierType", "id_identifierValue"],
  regulatory: [
    "reg_foundedYear",
    "reg_lineOfBusiness",
    "reg_authorizedJurisdictionStates",
    "reg_rating",
    "reg_tpaNonTpa",
    "reg_isC2CRplParticipant",
    "reg_use1035YP",
  ],
  business_holidays: [
    "hol_holidayName",
    "hol_holidayType",
    "hol_dateOrOccurrence",
  ],
  hours_operation: [
    "hrs_businessHourStart",
    "hrs_businessHourEnd",
    "hrs_businessDays",
    "hrs_businessHoursTimeZone",
  ],
  connectors: [
    "conn_dtcc_participantId",
    "conn_dtcc_locationId",
    "conn_c2c_participantId",
    "conn_c2c_locationId",
  ],
  addresses: [
    "addr_addressType",
    "addr_addressLine1",
    "addr_addressLine2",
    "addr_addressLine3",
    "addr_city",
    "addr_state",
    "addr_addressZipCode",
    "addr_addressZipCodeExt",
    "addr_addressCountry",
    "addr_addressEffectiveDate",
    "addr_addressEndDate",
  ],
  phones: [
    "phone_phoneType",
    "phone_countryCode",
    "phone_areaCode",
    "phone_dialNumber",
    "phone_extension",
    "phone_phoneEffectiveDate",
    "phone_phoneEndDate",
  ],
  emails: [
    "em_emailType",
    "em_emailAddress",
    "em_emailEffectiveDate",
    "em_emailEndDate",
  ],
};

export const UPDATE_CATEGORY_LABELS: Record<UpdateCategoryId, string> = {
  basic_details: "Basic carrier details",
  org_hierarchy: "Organization and hierarchy",
  urls: "URLs",
  identifiers: "Identifiers",
  regulatory: "Regulatory details",
  business_holidays: "Business holidays",
  hours_operation: "Hours of operation",
  connectors: "Connectors",
  addresses: "Addresses",
  phones: "Phones",
  emails: "Emails",
};
