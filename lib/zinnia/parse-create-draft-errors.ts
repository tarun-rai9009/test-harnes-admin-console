/**
 * Map Zinnia API error bodies to create-draft form field keys (no server-only).
 */

import { FIELD_ORDER } from "@/lib/workflows/create-carrier-draft-form-utils";
import { parseZinniaErrorBodyForAllowedKeys } from "@/lib/zinnia/parse-zinnia-validation-body";

const ALLOWED = new Set<string>([...FIELD_ORDER]);

/**
 * Pull field-level messages from common API error JSON shapes; remainder as form-level.
 */
export function parseZinniaCreateDraftErrorBody(bodyText: string): {
  fieldErrors: Record<string, string>;
  formLevelMessage?: string;
} {
  return parseZinniaErrorBodyForAllowedKeys(bodyText, ALLOWED);
}
