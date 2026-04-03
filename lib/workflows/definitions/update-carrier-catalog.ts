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
      error:
        "Which area should we update? You can name it (for example “URLs” or “addresses”) or pick a number from the list.",
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
    error:
      "I didn’t match that to a section. Try a name like “basic details”, “phones”, or “regulatory”, or reply with a number 1–11 from the list.",
  };
}

function categoryPromptText(): string {
  const lines = UPDATE_CATEGORY_ORDER.map(
    (id, i) => `${i + 1}. ${UPDATE_CATEGORY_LABELS[id]}`,
  );
  return [
    "Which part of this carrier should we update? Reply with the name or a number.",
    "",
    ...lines,
    "",
    "What would you like to update?",
  ].join("\n");
}

const INTROS: Record<UpdateCategoryId, string> = {
  basic_details:
    "I’ll go through the basics — IDs, name, entity type, line of business, and product types. Say skip for anything that should stay the same.",
  org_hierarchy:
    "We’ll update organization and hierarchy details — parents, legal name, DBA, short name, and logo reference. Say skip when you’re not changing something.",
  urls:
    "We’ll update web and login links — main site, carrier, agent, and customer logins. Say skip for any you’re leaving as-is.",
  identifiers:
    "We’ll capture the identifier type and value (for example a registration or reference ID). Say skip if you’re not changing this.",
  regulatory:
    "We’ll update regulatory fields — year founded, jurisdictions, rating, TPA flags, and related yes/no items. Say skip where nothing changes.",
  business_holidays:
    "We’ll add or update one holiday entry — name, type, and when it occurs. Say skip if you’re not changing holidays.",
  hours_operation:
    "We’ll update hours of operation — start, end, days, and time zone. Say skip for anything unchanged.",
  connectors:
    "We’ll update connector IDs — you can provide DTCC and/or C2C participant and location IDs. Say skip for either side you’re not changing.",
  addresses:
    "We’ll update one address — type, lines, city, state, ZIP, country, and effective dates. Say skip for fields that stay the same.",
  phones:
    "We’ll update one phone record — type, country and area codes, number, extension, and dates. Say skip where needed.",
  emails:
    "We’ll update one email — type, address, and effective dates. Say skip if a field stays the same.",
};

export function getUpdateCarrierOptionalIntro(
  merged: Record<string, unknown>,
): string {
  const cat = merged.updateCategory as UpdateCategoryId | undefined;
  if (cat && INTROS[cat]) return INTROS[cat];
  return "Share the new values below. Say skip for anything that should stay as-is.";
}

export function getUpdateCarrierNoChangesMessage(): string {
  return "I need at least one value in this section to send an update. Please fill in a field you want changed, or say skip only when that field truly stays the same.";
}

export const UPDATE_CARRIER_FIELD_GROUPS: WorkflowFieldGroupDefinition[] = [
  {
    id: "step_carrier_code",
    requiredFields: [
      {
        key: "carrierCode",
        required: true,
        summaryLabel: "Carrier code",
        businessPrompt:
          "Which carrier should we update? Please share the carrier code your team uses.",
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
        "What carrier record ID should we store? (Say skip if it’s unchanged.)",
      ),
      opt(
        "basic_secondaryCarrierCode",
        "Secondary carrier code",
        "Should we set or change a secondary carrier code?",
      ),
      opt(
        "basic_entityType",
        "Entity type",
        "What entity type should we show (for example corporation or LLC)?",
      ),
      opt(
        "basic_carrierName",
        "Carrier name",
        "What display name should we use for this carrier?",
      ),
      opt(
        "basic_lineOfBusiness",
        "Line of business",
        "Which line of business should we record?",
      ),
      opt(
        "basic_productTypes",
        "Product types",
        "Which product types apply? List them separated by commas.",
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
        "What ID should we use for the ultimate parent company?",
      ),
      opt(
        "org_parentCompanyId",
        "Parent company ID",
        "What ID should we use for the immediate parent company?",
      ),
      opt(
        "org_organizationName",
        "Legal organization name",
        "What is the full legal organization name?",
      ),
      opt(
        "org_organizationDba",
        "DBA",
        "What doing-business-as name should we show?",
      ),
      opt(
        "org_organizationShortName",
        "Short name",
        "Is there a short name we should use in tight spaces?",
      ),
      opt(
        "org_logoAssetReference",
        "Logo reference",
        "Do you have a logo reference or asset ID to attach?",
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
        "What website or domain name should we list?",
      ),
      opt(
        "url_carrierLoginUrl",
        "Carrier login URL",
        "What URL should carriers use to sign in?",
      ),
      opt(
        "url_agentLoginUrl",
        "Agent login URL",
        "What URL should agents use to sign in?",
      ),
      opt(
        "url_customerLoginUrl",
        "Customer login URL",
        "What URL should customers use to sign in?",
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
        "What kind of identifier is this (for example NAIC or FEIN)?",
      ),
      opt(
        "id_identifierValue",
        "Identifier value",
        "What value should we store for that identifier?",
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
        "What year was the organization founded? (Four digits, or skip.)",
        validateOptionalYear("year founded"),
      ),
      opt(
        "reg_lineOfBusiness",
        "Regulatory line of business",
        "What line of business should we note for regulatory purposes?",
      ),
      opt(
        "reg_authorizedJurisdictionStates",
        "Authorized jurisdictions / states",
        "Which states or jurisdictions are authorized? (List or describe.)",
      ),
      opt(
        "reg_rating",
        "Rating",
        "What rating should we record, if any?",
      ),
      opt(
        "reg_tpaNonTpa",
        "TPA / non-TPA",
        "Any TPA or non-TPA detail we should capture?",
      ),
      opt(
        "reg_isC2CRplParticipant",
        "C2C RPL participant",
        "Is this carrier a C2C RPL participant? (Yes, no, or skip.)",
        validateOptionalYesNo("C2C RPL participation"),
      ),
      opt(
        "reg_use1035YP",
        "1035 YP",
        "Does the 1035 YP flag apply? (Yes, no, or skip.)",
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
        "What is the holiday called?",
      ),
      opt(
        "hol_holidayType",
        "Holiday type",
        "What type of holiday is it (for example company-wide or market closure)?",
      ),
      opt(
        "hol_dateOrOccurrence",
        "Date or pattern",
        "When does it occur — a specific date or a rule (for example “last Monday in May”)?",
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
        "What time does the business day start?",
      ),
      opt(
        "hrs_businessHourEnd",
        "Business day end",
        "What time does the business day end?",
      ),
      opt(
        "hrs_businessDays",
        "Business days",
        "Which days of the week are you open?",
      ),
      opt(
        "hrs_businessHoursTimeZone",
        "Time zone",
        "Which time zone should we use for those hours?",
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
        "What DTCC participant ID should we use? (Skip if not updating.)",
      ),
      opt(
        "conn_dtcc_locationId",
        "DTCC location ID",
        "What DTCC location ID should we use?",
      ),
      opt(
        "conn_c2c_participantId",
        "C2C participant ID",
        "What C2C-connected carrier participant ID should we use?",
      ),
      opt(
        "conn_c2c_locationId",
        "C2C location ID",
        "What C2C location ID should we use?",
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
        "What type of address is this (for example mailing or headquarters)?",
      ),
      opt("addr_addressLine1", "Address line 1", "What is address line 1?"),
      opt("addr_addressLine2", "Address line 2", "What is address line 2?"),
      opt("addr_addressLine3", "Address line 3", "What is address line 3?"),
      opt("addr_city", "City", "What city?"),
      opt("addr_state", "State / province", "What state or province?"),
      opt("addr_addressZipCode", "ZIP / postal code", "What ZIP or postal code?"),
      opt(
        "addr_addressZipCodeExt",
        "ZIP extension",
        "Any ZIP+4 extension?",
      ),
      opt("addr_addressCountry", "Country", "What country?"),
      opt(
        "addr_addressEffectiveDate",
        "Effective date",
        "When should this address take effect?",
      ),
      opt("addr_addressEndDate", "End date", "When should it end, if ever?"),
    ],
  },
  {
    id: "cat_phones",
    isActive: (d) => d.updateCategory === "phones",
    requiredFields: [],
    optionalFields: [
      opt("phone_phoneType", "Phone type", "What kind of number is this?"),
      opt(
        "phone_countryCode",
        "Country code",
        "What country code should we use?",
      ),
      opt("phone_areaCode", "Area code", "What area or region code?"),
      opt(
        "phone_dialNumber",
        "Phone number",
        "What is the main phone number?",
      ),
      opt("phone_extension", "Extension", "Any extension?"),
      opt(
        "phone_phoneEffectiveDate",
        "Effective date",
        "When should this number take effect?",
      ),
      opt("phone_phoneEndDate", "End date", "When should it stop being used?"),
    ],
  },
  {
    id: "cat_emails",
    isActive: (d) => d.updateCategory === "emails",
    requiredFields: [],
    optionalFields: [
      opt("em_emailType", "Email type", "What type of email is this?"),
      opt(
        "em_emailAddress",
        "Email address",
        "What email address should we use?",
      ),
      opt(
        "em_emailEffectiveDate",
        "Effective date",
        "When should this email take effect?",
      ),
      opt("em_emailEndDate", "End date", "When should it stop being used?"),
    ],
  },
];
