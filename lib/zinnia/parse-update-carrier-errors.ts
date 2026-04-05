import { UPDATE_FIELD_CONFIRM_LABELS } from "@/lib/workflows/definitions/update-carrier-payload";
import { parseZinniaErrorBodyForAllowedKeys } from "@/lib/zinnia/parse-zinnia-validation-body";

const ALLOWED = new Set<string>([
  ...Object.keys(UPDATE_FIELD_CONFIRM_LABELS),
  "carrierCode",
]);

/**
 * Map Zinnia PUT /carriers error bodies onto update form keys (flat collected keys).
 */
export function parseZinniaUpdateCarrierErrorBody(bodyText: string): {
  fieldErrors: Record<string, string>;
  formLevelMessage?: string;
} {
  return parseZinniaErrorBodyForAllowedKeys(bodyText, ALLOWED);
}
