import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
} from "@/lib/workflows/definitions/update-carrier-constants";

function trimVal(values: Record<string, string>, key: string): string {
  return (values[key] ?? "").trim();
}

function nonEmpty(values: Record<string, string>, key: string): boolean {
  return trimVal(values, key).length > 0;
}

function anyFieldNonEmpty(
  categoryId: UpdateCategoryId,
  values: Record<string, string>,
): boolean {
  const keys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  return keys.some((k) => nonEmpty(values, k));
}

/**
 * Extra rules from `openapi.yaml` (required nested properties) when the user
 * is updating a section — run after per-field validators.
 */
export function getOpenApiUpdateSectionRequirementErrors(
  categoryId: UpdateCategoryId,
  values: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (categoryId) {
    case "addresses": {
      if (!anyFieldNonEmpty("addresses", values)) return errors;
      if (!nonEmpty(values, "addr_addressLine1")) {
        errors.addr_addressLine1 = "Line 1 required for address updates.";
      }
      if (!nonEmpty(values, "addr_city")) {
        errors.addr_city = "City required for address updates.";
      }
      return errors;
    }
    case "phones": {
      if (!anyFieldNonEmpty("phones", values)) return errors;
      if (!nonEmpty(values, "phone_dialNumber")) {
        errors.phone_dialNumber = "Number required for phone updates.";
      }
      return errors;
    }
    case "emails": {
      if (!anyFieldNonEmpty("emails", values)) return errors;
      if (!nonEmpty(values, "em_emailAddress")) {
        errors.em_emailAddress = "Email required for email updates.";
      }
      return errors;
    }
    case "connectors": {
      const dtccP = nonEmpty(values, "conn_dtcc_participantId");
      const dtccL = nonEmpty(values, "conn_dtcc_locationId");
      if (dtccP || dtccL) {
        if (!dtccP) {
          errors.conn_dtcc_participantId = "DTCC needs both participant and location ID.";
        }
        if (!dtccL) {
          errors.conn_dtcc_locationId = "DTCC needs both participant and location ID.";
        }
      }
      const c2cP = nonEmpty(values, "conn_c2c_participantId");
      const c2cL = nonEmpty(values, "conn_c2c_locationId");
      if (c2cP || c2cL) {
        if (!c2cP) {
          errors.conn_c2c_participantId = "C2C needs both participant and location ID.";
        }
        if (!c2cL) {
          errors.conn_c2c_locationId = "C2C needs both participant and location ID.";
        }
      }
      return errors;
    }
    case "hours_operation": {
      if (!anyFieldNonEmpty("hours_operation", values)) return errors;
      if (!nonEmpty(values, "hrs_businessHourStart")) {
        errors.hrs_businessHourStart = "Start time required.";
      }
      if (!nonEmpty(values, "hrs_businessHourEnd")) {
        errors.hrs_businessHourEnd = "End time required.";
      }
      if (!nonEmpty(values, "hrs_businessDays")) {
        errors.hrs_businessDays = "Business days required.";
      }
      return errors;
    }
    case "business_holidays": {
      if (!anyFieldNonEmpty("business_holidays", values)) return errors;
      if (!nonEmpty(values, "hol_holidayName")) {
        errors.hol_holidayName = "Holiday name required.";
      }
      if (!nonEmpty(values, "hol_holidayType")) {
        errors.hol_holidayType = "Holiday type required.";
      }
      if (!nonEmpty(values, "hol_dateOrOccurrence")) {
        errors.hol_dateOrOccurrence = "Date or pattern required.";
      }
      return errors;
    }
    case "identifiers": {
      if (!anyFieldNonEmpty("identifiers", values)) return errors;
      if (!nonEmpty(values, "id_identifierType")) {
        errors.id_identifierType = "Identifier type required.";
      }
      if (!nonEmpty(values, "id_identifierValue")) {
        errors.id_identifierValue = "Identifier value required.";
      }
      return errors;
    }
    default:
      return errors;
  }
}
