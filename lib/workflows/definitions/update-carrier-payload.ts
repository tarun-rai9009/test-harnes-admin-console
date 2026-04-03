import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
  UPDATE_CATEGORY_LABELS,
} from "@/lib/workflows/definitions/update-carrier-constants";
import type { UpdateCarrierPayload } from "@/types/zinnia/carriers";

function str(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/** Human labels for confirmation rows (flat keys → copy). */
export const UPDATE_FIELD_CONFIRM_LABELS: Record<string, string> = {
  basic_carrierId: "Carrier record ID",
  basic_secondaryCarrierCode: "Secondary carrier code",
  basic_entityType: "Entity type",
  basic_carrierName: "Carrier name",
  basic_lineOfBusiness: "Line of business",
  basic_productTypes: "Product types",
  org_ultimateParentCompanyId: "Ultimate parent company ID",
  org_parentCompanyId: "Parent company ID",
  org_organizationName: "Organization legal name",
  org_organizationDba: "DBA name",
  org_organizationShortName: "Short organization name",
  org_logoAssetReference: "Logo reference",
  url_organizationDomainName: "Organization website / domain",
  url_carrierLoginUrl: "Carrier login URL",
  url_agentLoginUrl: "Agent login URL",
  url_customerLoginUrl: "Customer login URL",
  id_identifierType: "Identifier type",
  id_identifierValue: "Identifier value",
  reg_foundedYear: "Year founded",
  reg_lineOfBusiness: "Regulatory — line of business",
  reg_authorizedJurisdictionStates: "Authorized states / jurisdictions",
  reg_rating: "Rating",
  reg_tpaNonTpa: "TPA / non-TPA",
  reg_isC2CRplParticipant: "C2C RPL participant",
  reg_use1035YP: "1035 YP",
  hol_holidayName: "Holiday name",
  hol_holidayType: "Holiday type",
  hol_dateOrOccurrence: "Holiday date or pattern",
  hrs_businessHourStart: "Business hours — start",
  hrs_businessHourEnd: "Business hours — end",
  hrs_businessDays: "Business days",
  hrs_businessHoursTimeZone: "Business hours time zone",
  conn_dtcc_participantId: "DTCC — participant ID",
  conn_dtcc_locationId: "DTCC — location ID",
  conn_c2c_participantId: "C2C carrier — participant ID",
  conn_c2c_locationId: "C2C carrier — location ID",
  addr_addressType: "Address type",
  addr_addressLine1: "Address line 1",
  addr_addressLine2: "Address line 2",
  addr_addressLine3: "Address line 3",
  addr_city: "City",
  addr_state: "State / province",
  addr_addressZipCode: "ZIP / postal code",
  addr_addressZipCodeExt: "ZIP extension",
  addr_addressCountry: "Country",
  addr_addressEffectiveDate: "Address effective date",
  addr_addressEndDate: "Address end date",
  phone_phoneType: "Phone type",
  phone_countryCode: "Phone country code",
  phone_areaCode: "Area code",
  phone_dialNumber: "Phone number",
  phone_extension: "Extension",
  phone_phoneEffectiveDate: "Phone effective date",
  phone_phoneEndDate: "Phone end date",
  em_emailType: "Email type",
  em_emailAddress: "Email address",
  em_emailEffectiveDate: "Email effective date",
  em_emailEndDate: "Email end date",
};

export function collectedParamsToUpdatePayload(
  data: Record<string, unknown>,
): UpdateCarrierPayload {
  const cat = data.updateCategory as UpdateCategoryId | undefined;
  if (!cat) return {};

  switch (cat) {
    case "basic_details": {
      const base = pickDefined({
        carrierId: str(data, "basic_carrierId"),
        secondaryCarrierCode: str(data, "basic_secondaryCarrierCode"),
        entityType: str(data, "basic_entityType"),
        carrierName: str(data, "basic_carrierName"),
        lineOfBusiness: str(data, "basic_lineOfBusiness"),
        productTypes:
          Array.isArray(data.basic_productTypes) &&
          (data.basic_productTypes as unknown[]).length
            ? (data.basic_productTypes as string[])
            : undefined,
      });
      return Object.keys(base).length ? { base } : {};
    }
    case "org_hierarchy": {
      const base = pickDefined({
        ultimateParentCompanyId: str(data, "org_ultimateParentCompanyId"),
        parentCompanyId: str(data, "org_parentCompanyId"),
        organizationName: str(data, "org_organizationName"),
        organizationDba: str(data, "org_organizationDba"),
        organizationShortName: str(data, "org_organizationShortName"),
        logoAssetReference: str(data, "org_logoAssetReference"),
      });
      return Object.keys(base).length ? { base } : {};
    }
    case "urls": {
      const urls = pickDefined({
        organizationDomainName: str(data, "url_organizationDomainName"),
        carrierLoginUrl: str(data, "url_carrierLoginUrl"),
        agentLoginUrl: str(data, "url_agentLoginUrl"),
        customerLoginUrl: str(data, "url_customerLoginUrl"),
      });
      if (!Object.keys(urls).length) return {};
      return { base: { urls } };
    }
    case "identifiers": {
      const identifiers = pickDefined({
        identifierType: str(data, "id_identifierType"),
        identifierValue: str(data, "id_identifierValue"),
      });
      if (!Object.keys(identifiers).length) return {};
      return { base: { identifiers } };
    }
    case "regulatory": {
      const regulatory = pickDefined({
        foundedYear: str(data, "reg_foundedYear"),
        lineOfBusiness: str(data, "reg_lineOfBusiness"),
        authorizedJurisdictionStates: str(
          data,
          "reg_authorizedJurisdictionStates",
        ),
        rating: str(data, "reg_rating"),
        tpaNonTpa: str(data, "reg_tpaNonTpa"),
        isC2CRplParticipant:
          typeof data.reg_isC2CRplParticipant === "boolean"
            ? data.reg_isC2CRplParticipant
            : undefined,
        use1035YP:
          typeof data.reg_use1035YP === "boolean"
            ? data.reg_use1035YP
            : undefined,
      });
      if (!Object.keys(regulatory).length) return {};
      return { base: { regulatory } };
    }
    case "business_holidays": {
      const row = pickDefined({
        holidayName: str(data, "hol_holidayName"),
        holidayType: str(data, "hol_holidayType"),
        dateOrOccurrence: str(data, "hol_dateOrOccurrence"),
      });
      if (!Object.keys(row).length) return {};
      return { base: { businessHolidays: [row] } };
    }
    case "hours_operation": {
      const hoursOfOperation = pickDefined({
        businessHourStart: str(data, "hrs_businessHourStart"),
        businessHourEnd: str(data, "hrs_businessHourEnd"),
        businessDays: str(data, "hrs_businessDays"),
        businessHoursTimeZone: str(data, "hrs_businessHoursTimeZone"),
      });
      if (!Object.keys(hoursOfOperation).length) return {};
      return { base: { hoursOfOperation } };
    }
    case "connectors": {
      const dtcc = pickDefined({
        participantId: str(data, "conn_dtcc_participantId"),
        locationId: str(data, "conn_dtcc_locationId"),
      });
      const c2c = pickDefined({
        participantId: str(data, "conn_c2c_participantId"),
        locationId: str(data, "conn_c2c_locationId"),
      });
      const connectors: NonNullable<UpdateCarrierPayload["connectors"]> = {};
      if (Object.keys(dtcc).length) connectors.dtccIds = [dtcc];
      if (Object.keys(c2c).length) connectors.c2cConnectedCarriers = [c2c];
      return Object.keys(connectors).length ? { connectors } : {};
    }
    case "addresses": {
      const row = pickDefined({
        addressType: str(data, "addr_addressType"),
        addressLine1: str(data, "addr_addressLine1"),
        addressLine2: str(data, "addr_addressLine2"),
        addressLine3: str(data, "addr_addressLine3"),
        city: str(data, "addr_city"),
        state: str(data, "addr_state"),
        addressZipCode: str(data, "addr_addressZipCode"),
        addressZipCodeExt: str(data, "addr_addressZipCodeExt"),
        addressCountry: str(data, "addr_addressCountry"),
        addressEffectiveDate: str(data, "addr_addressEffectiveDate"),
        addressEndDate: str(data, "addr_addressEndDate"),
      });
      if (!Object.keys(row).length) return {};
      return { addresses: [row] };
    }
    case "phones": {
      const row = pickDefined({
        phoneType: str(data, "phone_phoneType"),
        countryCode: str(data, "phone_countryCode"),
        areaCode: str(data, "phone_areaCode"),
        dialNumber: str(data, "phone_dialNumber"),
        extension: str(data, "phone_extension"),
        phoneEffectiveDate: str(data, "phone_phoneEffectiveDate"),
        phoneEndDate: str(data, "phone_phoneEndDate"),
      });
      if (!Object.keys(row).length) return {};
      return { phones: [row] };
    }
    case "emails": {
      const row = pickDefined({
        emailType: str(data, "em_emailType"),
        emailAddress: str(data, "em_emailAddress"),
        emailEffectiveDate: str(data, "em_emailEffectiveDate"),
        emailEndDate: str(data, "em_emailEndDate"),
      });
      if (!Object.keys(row).length) return {};
      return { emails: [row] };
    }
    default:
      return {};
  }
}

export function updatePayloadHasBody(p: UpdateCarrierPayload): boolean {
  if (p.base && Object.keys(p.base).length) return true;
  if (p.connectors && Object.keys(p.connectors).length) return true;
  if (p.addresses?.length) return true;
  if (p.phones?.length) return true;
  if (p.emails?.length) return true;
  return false;
}

export function isUpdateValueProvided(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function updateCarrierHasCategoryChanges(
  data: Record<string, unknown>,
): boolean {
  const cat = data.updateCategory;
  if (typeof cat !== "string") return false;
  const keys = UPDATE_CATEGORY_FIELD_KEYS[cat as UpdateCategoryId];
  if (!keys) return false;
  for (const k of keys) {
    if (isUpdateValueProvided(data[k])) return true;
  }
  return false;
}

export function buildUpdateConfirmationRowsFromData(
  data: Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const code = data.carrierCode;
  if (code != null && String(code).trim() !== "") {
    rows.push({ label: "Carrier code", value: String(code).toUpperCase() });
  }
  const cat = data.updateCategory;
  if (typeof cat === "string" && UPDATE_CATEGORY_LABELS[cat as UpdateCategoryId]) {
    rows.push({
      label: "Section",
      value: UPDATE_CATEGORY_LABELS[cat as UpdateCategoryId],
    });
  }

  const keys =
    typeof cat === "string"
      ? UPDATE_CATEGORY_FIELD_KEYS[cat as UpdateCategoryId]
      : undefined;
  if (keys) {
    for (const key of keys) {
      if (!isUpdateValueProvided(data[key])) continue;
      const label = UPDATE_FIELD_CONFIRM_LABELS[key] ?? key;
      const v = data[key];
      let display: string;
      if (Array.isArray(v)) display = v.join(", ");
      else if (typeof v === "boolean") display = v ? "Yes" : "No";
      else display = String(v);
      rows.push({ label, value: display });
    }
  }
  return rows;
}
