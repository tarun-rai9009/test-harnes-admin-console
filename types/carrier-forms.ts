/**
 * Shared types for create-draft and update-section forms in the admin UI.
 */

export type FormFieldSelectOption = { value: string; label: string };

export type CreateCarrierDraftFormField = {
  key: string;
  label: string;
  required: boolean;
  /** Use a taller input (free text only; not used when enumOptions is set). */
  multiline?: boolean;
  /** From OpenAPI enum — render as `<select>` or checkboxes. */
  enumOptions?: FormFieldSelectOption[];
  /** Multi-value enum via `<select multiple>`; comma-separated in `values`. */
  selectMultiple?: boolean;
  /** Multi-value enum via checkbox group; comma-separated in `values`. */
  enumCheckboxGroup?: boolean;
};

/** Shown when create-draft validation fails or user is correcting fields before save. */
export type CreateCarrierDraftFormState = {
  fields: CreateCarrierDraftFormField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  /** Non-field-specific message (e.g. Zinnia business error or network). */
  formLevelError?: string;
};

/** Same shape as create-draft section fields; used for per-category update forms. */
export type UpdateCarrierSectionFormState = CreateCarrierDraftFormState;
