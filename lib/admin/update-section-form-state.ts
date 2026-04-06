import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import {
  buildUpdateCarrierSectionFormFields,
  stringValuesForUpdateSection,
} from "@/lib/workflows/update-carrier-section-form";
import type { UpdateCarrierSectionFormState } from "@/types/carrier-forms";

export function buildUpdateSectionFormStateAdmin(
  collected: Record<string, unknown>,
  categoryId: UpdateCategoryId,
  errors: Record<string, string> = {},
  formLevelError?: string,
): UpdateCarrierSectionFormState {
  return {
    fields: buildUpdateCarrierSectionFormFields(categoryId),
    values: stringValuesForUpdateSection(collected, categoryId),
    errors,
    formLevelError,
  };
}
