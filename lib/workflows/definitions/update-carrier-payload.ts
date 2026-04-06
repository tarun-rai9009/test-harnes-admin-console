import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
  UPDATE_CATEGORY_LABELS,
  UPDATE_CATEGORY_ORDER,
} from "@/lib/workflows/definitions/update-carrier-constants";
import type {
  CarrierDetails,
  UpdateCarrierBaseSection,
  UpdateCarrierPayload,
} from "@/types/zinnia/carriers";

/** After saving one section, drop its fields so the next category starts clean. */
export function stripUpdateCategoryKeysFromCollected(
  data: Record<string, unknown>,
  categoryId: UpdateCategoryId,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...data };
  for (const k of UPDATE_CATEGORY_FIELD_KEYS[categoryId]) {
    delete next[k];
  }
  delete next.updateCategory;
  return next;
}

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

/** OpenAPI expects `authorizedJurisdictionStates` as string[]; form collects comma-separated text. */
function jurisdictionStatesArray(
  data: Record<string, unknown>,
): string[] | undefined {
  const s = str(data, "reg_authorizedJurisdictionStates");
  if (!s) return undefined;
  const parts = s
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function foundedYearAsNumber(data: Record<string, unknown>): number | undefined {
  const s = str(data, "reg_foundedYear");
  if (!s || !/^\d{4}$/.test(s)) return undefined;
  return parseInt(s, 10);
}

/** OpenAPI `YnEnum` — Jackson expects "Y" / "N", not booleans. */
function ynEnumFromCollected(
  data: Record<string, unknown>,
  key: string,
): "Y" | "N" | undefined {
  const v = data[key];
  if (typeof v === "boolean") return v ? "Y" : "N";
  if (v === "Y" || v === "N") return v;
  return undefined;
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
      const row = pickDefined({
        organizationDomainName: str(data, "url_organizationDomainName"),
        carrierLoginUrl: str(data, "url_carrierLoginUrl"),
        agentLoginUrl: str(data, "url_agentLoginUrl"),
        customerLoginUrl: str(data, "url_customerLoginUrl"),
      });
      if (!Object.keys(row).length) return {};
      return { base: { urls: [row] } };
    }
    case "identifiers": {
      const row = pickDefined({
        identifierType: str(data, "id_identifierType"),
        identifierValue: str(data, "id_identifierValue"),
      });
      if (!Object.keys(row).length) return {};
      return { base: { identifiers: [row] } };
    }
    case "regulatory": {
      const regulatory = pickDefined({
        foundedYear: foundedYearAsNumber(data),
        lineOfBusiness: str(data, "reg_lineOfBusiness"),
        authorizedJurisdictionStates: jurisdictionStatesArray(data),
        rating: str(data, "reg_rating"),
        tpaNonTpa: str(data, "reg_tpaNonTpa"),
        isC2CRplParticipant: ynEnumFromCollected(data, "reg_isC2CRplParticipant"),
        use1035YP: ynEnumFromCollected(data, "reg_use1035YP"),
      });
      if (!Object.keys(regulatory).length) return {};
      return { base: { regulatory: [regulatory] } };
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
      const row = pickDefined({
        businessHourStart: str(data, "hrs_businessHourStart"),
        businessHourEnd: str(data, "hrs_businessHourEnd"),
        businessDays: str(data, "hrs_businessDays"),
        businessHoursTimeZone: str(data, "hrs_businessHoursTimeZone"),
      });
      if (!Object.keys(row).length) return {};
      return { base: { hoursOfOperation: [row] } };
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

function mergeBaseSections(
  a?: UpdateCarrierBaseSection,
  b?: UpdateCarrierBaseSection,
): UpdateCarrierBaseSection | undefined {
  if (!a && !b) return undefined;
  const {
    urls: aUrls,
    identifiers: aId,
    regulatory: aReg,
    businessHolidays: aHol,
    hoursOfOperation: aHrs,
    productTypes: aPt,
    ...aRest
  } = a ?? {};
  const {
    urls: bUrls,
    identifiers: bId,
    regulatory: bReg,
    businessHolidays: bHol,
    hoursOfOperation: bHrs,
    productTypes: bPt,
    ...bRest
  } = b ?? {};
  const out: UpdateCarrierBaseSection = { ...aRest, ...bRest };
  const urls = [...(aUrls ?? []), ...(bUrls ?? [])];
  if (urls.length) out.urls = urls;
  const identifiers = [...(aId ?? []), ...(bId ?? [])];
  if (identifiers.length) out.identifiers = identifiers;
  const regulatory = [...(aReg ?? []), ...(bReg ?? [])];
  if (regulatory.length) out.regulatory = regulatory;
  const businessHolidays = [...(aHol ?? []), ...(bHol ?? [])];
  if (businessHolidays.length) out.businessHolidays = businessHolidays;
  const hoursOfOperation = [...(aHrs ?? []), ...(bHrs ?? [])];
  if (hoursOfOperation.length) out.hoursOfOperation = hoursOfOperation;
  if (aPt?.length || bPt?.length) {
    out.productTypes = [...(aPt ?? []), ...(bPt ?? [])];
  }
  return Object.keys(out).length ? out : undefined;
}

/** Deep-merge partial PUT bodies from multiple section updates (single Zinnia PUT). */
export function mergeUpdateCarrierPayloads(
  a: UpdateCarrierPayload,
  b: UpdateCarrierPayload,
): UpdateCarrierPayload {
  const out: UpdateCarrierPayload = {};
  const base = mergeBaseSections(a.base, b.base);
  if (base) out.base = base;

  if (a.connectors || b.connectors) {
    const dtccIds = [
      ...(a.connectors?.dtccIds ?? []),
      ...(b.connectors?.dtccIds ?? []),
    ];
    const c2c = [
      ...(a.connectors?.c2cConnectedCarriers ?? []),
      ...(b.connectors?.c2cConnectedCarriers ?? []),
    ];
    const conn: NonNullable<UpdateCarrierPayload["connectors"]> = {};
    if (dtccIds.length) conn.dtccIds = dtccIds;
    if (c2c.length) conn.c2cConnectedCarriers = c2c;
    if (Object.keys(conn).length) out.connectors = conn;
  }

  const addresses = [...(a.addresses ?? []), ...(b.addresses ?? [])];
  if (addresses.length) out.addresses = addresses;
  const phones = [...(a.phones ?? []), ...(b.phones ?? [])];
  if (phones.length) out.phones = phones;
  const emails = [...(a.emails ?? []), ...(b.emails ?? [])];
  if (emails.length) out.emails = emails;

  return out;
}

/** Build one PUT body from collected flat params when multiple sections were edited. */
export function mergeCollectedParamsToUpdatePayload(
  data: Record<string, unknown>,
  categories: UpdateCategoryId[],
): UpdateCarrierPayload {
  return categories.reduce<UpdateCarrierPayload>((acc, cat) => {
    const partial = collectedParamsToUpdatePayload({
      ...data,
      updateCategory: cat,
    });
    return mergeUpdateCarrierPayloads(acc, partial);
  }, {});
}

export function stripMultiCategoryKeysFromCollected(
  data: Record<string, unknown>,
  categories: UpdateCategoryId[],
): Record<string, unknown> {
  let next: Record<string, unknown> = { ...data };
  for (const cat of categories) {
    next = stripUpdateCategoryKeysFromCollected(next, cat);
  }
  delete next.selectedUpdateCategories;
  delete next.updateCategory;
  return next;
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
      else if (v === "Y" || v === "N") display = v === "Y" ? "Yes" : "No";
      else display = String(v);
      rows.push({ label, value: display });
    }
  }
  return rows;
}

/** Confirmation table when multiple sections are updated in one save. */
export function buildUpdateConfirmationRowsFromMultiCategoryData(
  data: Record<string, unknown>,
  categories: UpdateCategoryId[],
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const code = data.carrierCode;
  if (code != null && String(code).trim() !== "") {
    rows.push({ label: "Carrier code", value: String(code).toUpperCase() });
  }
  rows.push({
    label: "Sections",
    value: categories.map((c) => UPDATE_CATEGORY_LABELS[c]).join(", "),
  });

  for (const cat of categories) {
    const keys = UPDATE_CATEGORY_FIELD_KEYS[cat];
    for (const key of keys) {
      if (!isUpdateValueProvided(data[key])) continue;
      const label = UPDATE_FIELD_CONFIRM_LABELS[key] ?? key;
      const v = data[key];
      let display: string;
      if (Array.isArray(v)) display = v.join(", ");
      else if (typeof v === "boolean") display = v ? "Yes" : "No";
      else if (v === "Y" || v === "N") display = v === "Y" ? "Yes" : "No";
      else display = String(v);
      rows.push({ label, value: display });
    }
  }
  return rows;
}

/**
 * Success card: carrier identity from the API response plus only the section
 * and field values that were submitted in this update.
 */
function isUpdateCategoryIdString(s: string): s is UpdateCategoryId {
  return (UPDATE_CATEGORY_ORDER as readonly string[]).includes(s);
}

export function buildUpdateSuccessSummaryCardFields(
  apiResult: CarrierDetails,
  submittedData: Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const code = apiResult.carrierCode?.trim() ?? "";
  const name = apiResult.carrierName?.trim() ?? "";
  rows.push({
    label: "Carrier code",
    value: code ? code.toUpperCase() : "—",
  });
  rows.push({ label: "Carrier name", value: name || "—" });

  const multi = submittedData.selectedUpdateCategories;
  if (Array.isArray(multi) && multi.length > 0) {
    const cats = multi.filter(
      (c): c is UpdateCategoryId =>
        typeof c === "string" && isUpdateCategoryIdString(c),
    );
    if (cats.length > 0) {
      rows.push({
        label: "Sections updated",
        value: cats.map((c) => UPDATE_CATEGORY_LABELS[c]).join(", "),
      });
      for (const cat of cats) {
        for (const key of UPDATE_CATEGORY_FIELD_KEYS[cat]) {
          if (!isUpdateValueProvided(submittedData[key])) continue;
          const label = UPDATE_FIELD_CONFIRM_LABELS[key] ?? key;
          const v = submittedData[key];
          let display: string;
          if (Array.isArray(v)) display = v.join(", ");
          else if (typeof v === "boolean") display = v ? "Yes" : "No";
          else if (v === "Y" || v === "N") display = v === "Y" ? "Yes" : "No";
          else display = String(v);
          rows.push({ label, value: display });
        }
      }
      return rows;
    }
  }

  const cat = submittedData.updateCategory;
  if (typeof cat === "string" && UPDATE_CATEGORY_LABELS[cat as UpdateCategoryId]) {
    rows.push({
      label: "Section updated",
      value: UPDATE_CATEGORY_LABELS[cat as UpdateCategoryId],
    });
  }

  const keys =
    typeof cat === "string"
      ? UPDATE_CATEGORY_FIELD_KEYS[cat as UpdateCategoryId]
      : undefined;
  if (keys) {
    for (const key of keys) {
      if (!isUpdateValueProvided(submittedData[key])) continue;
      const label = UPDATE_FIELD_CONFIRM_LABELS[key] ?? key;
      const v = submittedData[key];
      let display: string;
      if (Array.isArray(v)) display = v.join(", ");
      else if (typeof v === "boolean") display = v ? "Yes" : "No";
      else if (v === "Y" || v === "N") display = v === "Y" ? "Yes" : "No";
      else display = String(v);
      rows.push({ label, value: display });
    }
  }
  return rows;
}
