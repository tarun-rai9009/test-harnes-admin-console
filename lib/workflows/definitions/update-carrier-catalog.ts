import type {
  FieldValidationResult,
  WorkflowFieldGroupDefinition,
} from "@/lib/workflows/workflow-types";
import {
  trimString,
  validateCarrierCode,
  validateOptionalProductTypes,
  validateOptionalString,
  validateOptionalYear,
  validateOptionalYesNo,
} from "@/lib/workflows/validators";
import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_LABELS,
  UPDATE_CATEGORY_ORDER,
} from "@/lib/workflows/definitions/update-carrier-constants";

function opt(
  key: string,
  summaryLabel: string,
  businessPrompt: string,
  validate = validateOptionalString(summaryLabel),
) {
  return {
    key,
    required: false as const,
    summaryLabel,
    businessPrompt,
    validate,
  };
}

export function validateUpdateCategory(raw: unknown): FieldValidationResult {
  const s = trimString(raw);
  if (!s) {
    return {
      ok: false,
      error: "Pick a section name or a number from the list.",
    };
  }
  const t = s.toLowerCase();
  const onlyNum = /^\s*(\d{1,2})\s*$/.exec(t);
  if (onlyNum) {
    const n = parseInt(onlyNum[1]!, 10);
    if (n >= 1 && n <= UPDATE_CATEGORY_ORDER.length) {
      return { ok: true, normalized: UPDATE_CATEGORY_ORDER[n - 1]! };
    }
  }

  if (/\b(holiday|observance|pto day)\b/.test(t)) {
    return { ok: true, normalized: "business_holidays" };
  }
  if (/\b(url|website|domain|login link)\b/.test(t)) {
    return { ok: true, normalized: "urls" };
  }
  if (/\b(identifier|id type|fein|naic)\b/.test(t)) {
    return { ok: true, normalized: "identifiers" };
  }
  if (/\b(regulatory|rating|jurisdiction|tpa|c2c rpl|1035)\b/.test(t)) {
    return { ok: true, normalized: "regulatory" };
  }
  if (/\b(hour|hours|schedule|time zone|open|close)\b/.test(t)) {
    return { ok: true, normalized: "hours_operation" };
  }
  if (/\b(dtcc|c2c|connector)\b/.test(t)) {
    return { ok: true, normalized: "connectors" };
  }
  if (/\b(address|mailing|street|city|state|zip|postal)\b/.test(t)) {
    return { ok: true, normalized: "addresses" };
  }
  if (/\b(phone|telephone|mobile|fax|extension|dial)\b/.test(t)) {
    return { ok: true, normalized: "phones" };
  }
  if (/\bemail\b/.test(t)) {
    return { ok: true, normalized: "emails" };
  }
  if (
    /\b(organization|hierarchy|parent company|ultimate parent|dba|legal name|logo)\b/.test(
      t,
    )
  ) {
    return { ok: true, normalized: "org_hierarchy" };
  }
  if (
    /\b(basic|carrier name|entity type|product type|line of business|secondary code)\b/.test(
      t,
    )
  ) {
    return { ok: true, normalized: "basic_details" };
  }

  for (const id of UPDATE_CATEGORY_ORDER) {
    const label = UPDATE_CATEGORY_LABELS[id].toLowerCase();
    if (t === id || t === label || label.includes(t) || t.includes(label)) {
      return { ok: true, normalized: id };
    }
  }

  return {
    ok: false,
    error: "No match. Try “basic details”, “phones”, or a list number.",
  };
}

function categoryPromptText(): string {
  const lines = UPDATE_CATEGORY_ORDER.map(
    (id, i) => `${i + 1}. ${UPDATE_CATEGORY_LABELS[id]}`,
  );
  return ["Pick a section (name or number):", "", ...lines].join("\n");
}

const INTROS: Record<UpdateCategoryId, string> = {
  basic_details: "Basics — say **skip** to leave unchanged.",
  org_hierarchy: "Org / hierarchy — say **skip** to leave unchanged.",
  urls: "URLs / logins — say **skip** to leave unchanged.",
  identifiers: "Identifier — say **skip** if unchanged.",
  regulatory: "Regulatory — say **skip** if unchanged.",
  business_holidays: "Holiday row — say **skip** if unchanged.",
  hours_operation: "Hours — say **skip** if unchanged.",
  connectors: "Connectors — say **skip** if unchanged.",
  addresses: "Address — say **skip** for unchanged fields.",
  phones: "Phone — say **skip** for unchanged fields.",
  emails: "Email — say **skip** for unchanged fields.",
};

export function getUpdateCarrierOptionalIntro(
  merged: Record<string, unknown>,
): string {
  const cat = merged.updateCategory as UpdateCategoryId | undefined;
  if (cat && INTROS[cat]) return INTROS[cat];
  return "New values below — **skip** if unchanged.";
}

export function getUpdateCarrierNoChangesMessage(): string {
  return "Change at least one field, or only **skip** what stays the same.";
}

export const UPDATE_CARRIER_FIELD_GROUPS: WorkflowFieldGroupDefinition[] = [
  {
    id: "step_carrier_code",
    requiredFields: [
      {
        key: "carrierCode",
        required: true,
        summaryLabel: "Carrier code",
        businessPrompt: "Carrier code to update?",
        validate: validateCarrierCode,
      },
    ],
    optionalFields: [],
  },
  {
    id: "step_pick_category",
    isActive: (d) => validateCarrierCode(d.carrierCode).ok,
    requiredFields: [
      {
        key: "updateCategory",
        required: true,
        summaryLabel: "Section to update",
        businessPrompt: categoryPromptText(),
        validate: validateUpdateCategory,
      },
    ],
    optionalFields: [],
  },
  {
    id: "cat_basic_details",
    isActive: (d) => d.updateCategory === "basic_details",
    requiredFields: [],
    optionalFields: [
      opt(
        "basic_carrierId",
        "Carrier record ID",
        "Carrier record ID? (**skip** if same)",
      ),
      opt(
        "basic_secondaryCarrierCode",
        "Secondary carrier code",
        "Secondary code?",
      ),
      opt(
        "basic_entityType",
        "Entity type",
        "Entity type?",
      ),
      opt(
        "basic_carrierName",
        "Carrier name",
        "Display name?",
      ),
      opt(
        "basic_lineOfBusiness",
        "Line of business",
        "Line of business?",
      ),
      opt(
        "basic_productTypes",
        "Product types",
        "Product types (comma-separated)?",
        validateOptionalProductTypes(),
      ),
    ],
  },
  {
    id: "cat_org_hierarchy",
    isActive: (d) => d.updateCategory === "org_hierarchy",
    requiredFields: [],
    optionalFields: [
      opt(
        "org_ultimateParentCompanyId",
        "Ultimate parent company ID",
        "Ultimate parent ID?",
      ),
      opt(
        "org_parentCompanyId",
        "Parent company ID",
        "Parent company ID?",
      ),
      opt(
        "org_organizationName",
        "Legal organization name",
        "Legal org name?",
      ),
      opt(
        "org_organizationDba",
        "DBA",
        "DBA?",
      ),
      opt(
        "org_organizationShortName",
        "Short name",
        "Short name?",
      ),
      opt(
        "org_logoAssetReference",
        "Logo reference",
        "Logo reference?",
      ),
    ],
  },
  {
    id: "cat_urls",
    isActive: (d) => d.updateCategory === "urls",
    requiredFields: [],
    optionalFields: [
      opt(
        "url_organizationDomainName",
        "Organization domain / website",
        "Domain / website?",
      ),
      opt(
        "url_carrierLoginUrl",
        "Carrier login URL",
        "Carrier login URL?",
      ),
      opt(
        "url_agentLoginUrl",
        "Agent login URL",
        "Agent login URL?",
      ),
      opt(
        "url_customerLoginUrl",
        "Customer login URL",
        "Customer login URL?",
      ),
    ],
  },
  {
    id: "cat_identifiers",
    isActive: (d) => d.updateCategory === "identifiers",
    requiredFields: [],
    optionalFields: [
      opt(
        "id_identifierType",
        "Identifier type",
        "Identifier type (e.g. NAIC)?",
      ),
      opt(
        "id_identifierValue",
        "Identifier value",
        "Identifier value?",
      ),
    ],
  },
  {
    id: "cat_regulatory",
    isActive: (d) => d.updateCategory === "regulatory",
    requiredFields: [],
    optionalFields: [
      opt(
        "reg_foundedYear",
        "Year founded",
        "Year founded (YYYY)?",
        validateOptionalYear("year founded"),
      ),
      opt(
        "reg_lineOfBusiness",
        "Regulatory line of business",
        "Regulatory LOB?",
      ),
      opt(
        "reg_authorizedJurisdictionStates",
        "Authorized jurisdictions / states",
        "Authorized states / jurisdictions?",
      ),
      opt(
        "reg_rating",
        "Rating",
        "Rating?",
      ),
      opt(
        "reg_tpaNonTpa",
        "TPA / non-TPA",
        "TPA detail?",
      ),
      opt(
        "reg_isC2CRplParticipant",
        "C2C RPL participant",
        "C2C RPL participant? (yes/no/**skip**)",
        validateOptionalYesNo("C2C RPL participation"),
      ),
      opt(
        "reg_use1035YP",
        "1035 YP",
        "1035 YP? (yes/no/**skip**)",
        validateOptionalYesNo("1035 YP"),
      ),
    ],
  },
  {
    id: "cat_holidays",
    isActive: (d) => d.updateCategory === "business_holidays",
    requiredFields: [],
    optionalFields: [
      opt(
        "hol_holidayName",
        "Holiday name",
        "Holiday name?",
      ),
      opt(
        "hol_holidayType",
        "Holiday type",
        "Holiday type?",
      ),
      opt(
        "hol_dateOrOccurrence",
        "Date or pattern",
        "Date or pattern?",
      ),
    ],
  },
  {
    id: "cat_hours",
    isActive: (d) => d.updateCategory === "hours_operation",
    requiredFields: [],
    optionalFields: [
      opt(
        "hrs_businessHourStart",
        "Business day start",
        "Open time?",
      ),
      opt(
        "hrs_businessHourEnd",
        "Business day end",
        "Close time?",
      ),
      opt(
        "hrs_businessDays",
        "Business days",
        "Business days?",
      ),
      opt(
        "hrs_businessHoursTimeZone",
        "Time zone",
        "Time zone?",
      ),
    ],
  },
  {
    id: "cat_connectors",
    isActive: (d) => d.updateCategory === "connectors",
    requiredFields: [],
    optionalFields: [
      opt(
        "conn_dtcc_participantId",
        "DTCC participant ID",
        "DTCC participant ID?",
      ),
      opt(
        "conn_dtcc_locationId",
        "DTCC location ID",
        "DTCC location ID?",
      ),
      opt(
        "conn_c2c_participantId",
        "C2C participant ID",
        "C2C participant ID?",
      ),
      opt(
        "conn_c2c_locationId",
        "C2C location ID",
        "C2C location ID?",
      ),
    ],
  },
  {
    id: "cat_addresses",
    isActive: (d) => d.updateCategory === "addresses",
    requiredFields: [],
    optionalFields: [
      opt(
        "addr_addressType",
        "Address type",
        "Address type?",
      ),
      opt("addr_addressLine1", "Address line 1", "Line 1?"),
      opt("addr_addressLine2", "Address line 2", "Line 2?"),
      opt("addr_addressLine3", "Address line 3", "Line 3?"),
      opt("addr_city", "City", "City?"),
      opt("addr_state", "State / province", "State / province?"),
      opt("addr_addressZipCode", "ZIP / postal code", "ZIP?"),
      opt(
        "addr_addressZipCodeExt",
        "ZIP extension",
        "ZIP+4?",
      ),
      opt("addr_addressCountry", "Country", "Country?"),
      opt(
        "addr_addressEffectiveDate",
        "Effective date",
        "Effective date?",
      ),
      opt("addr_addressEndDate", "End date", "End date?"),
    ],
  },
  {
    id: "cat_phones",
    isActive: (d) => d.updateCategory === "phones",
    requiredFields: [],
    optionalFields: [
      opt("phone_phoneType", "Phone type", "Phone type?"),
      opt(
        "phone_countryCode",
        "Country code",
        "Country code?",
      ),
      opt("phone_areaCode", "Area code", "Area code?"),
      opt(
        "phone_dialNumber",
        "Phone number",
        "Number?",
      ),
      opt("phone_extension", "Extension", "Extension?"),
      opt(
        "phone_phoneEffectiveDate",
        "Effective date",
        "Effective date?",
      ),
      opt("phone_phoneEndDate", "End date", "End date?"),
    ],
  },
  {
    id: "cat_emails",
    isActive: (d) => d.updateCategory === "emails",
    requiredFields: [],
    optionalFields: [
      opt("em_emailType", "Email type", "Email type?"),
      opt(
        "em_emailAddress",
        "Email address",
        "Email?",
      ),
      opt(
        "em_emailEffectiveDate",
        "Effective date",
        "Effective date?",
      ),
      opt("em_emailEndDate", "End date", "End date?"),
    ],
  },
];
