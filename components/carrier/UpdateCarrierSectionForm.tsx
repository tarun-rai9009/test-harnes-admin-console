"use client";

import {
  CarrierFormEnumControl,
  carrierFieldUsesEnumControl,
} from "@/components/carrier/CarrierFormEnumControl";
import type { EnumSelectOption } from "@/lib/workflows/carrier-form-enum-ui";
import type { UpdateCarrierSectionFormState } from "@/types/carrier-forms";
import type { DatapointReferenceMap } from "@/types/zinnia/datapoints";
import {
  type ValidateSectionResult,
  validateAndMergeUpdateCarrierSection,
} from "@/lib/workflows/update-carrier-section-form";
import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

export type UpdateCarrierSectionFormHandle = {
  flushMerge: (baseCollected: Record<string, unknown>) => ValidateSectionResult;
};

type Props = {
  form: UpdateCarrierSectionFormState;
  carrierCode: string;
  categoryId: UpdateCategoryId;
  disabled?: boolean;
  /** Merge into enum-backed fields (datapoint-driven options). */
  enumOptionsByFieldKey?: Record<string, EnumSelectOption[]>;
  referenceByKey?: DatapointReferenceMap;
  /** When false, hide the submit button (parent uses ref.flushMerge, e.g. accordion update). */
  showPrimarySubmit?: boolean;
  /** Full collected state for submit validation / change detection (defaults to carrier + category only). */
  mergeContextCollected?: Record<string, unknown>;
  onSubmit: (values: Record<string, string>) => void;
};

export const UpdateCarrierSectionForm = forwardRef<
  UpdateCarrierSectionFormHandle,
  Props
>(function UpdateCarrierSectionForm(
  {
    form,
    carrierCode,
    categoryId,
    disabled,
    enumOptionsByFieldKey,
    referenceByKey,
    showPrimarySubmit = true,
    mergeContextCollected,
    onSubmit,
  },
  ref,
) {
  const [values, setValues] = useState<Record<string, string>>(form.values);
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Record<string, string>
  >({});
  const [clientFormLevel, setClientFormLevel] = useState("");

  useEffect(() => {
    setValues(form.values);
  }, [form.values]);

  useEffect(() => {
    setClientFieldErrors({});
    setClientFormLevel("");
  }, [
    JSON.stringify(form.values),
    JSON.stringify(form.errors),
    form.formLevelError ?? "",
  ]);

  const setField = useCallback((key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const fieldError = useCallback(
    (key: string) => clientFieldErrors[key] ?? form.errors[key],
    [clientFieldErrors, form.errors],
  );

  const formLevelError = clientFormLevel || form.formLevelError || "";
  const hasAnyFieldError = form.fields.some((f) => Boolean(fieldError(f.key)));
  const hasValidationErrors =
    hasAnyFieldError || Boolean(formLevelError.trim());

  useImperativeHandle(
    ref,
    () => ({
      flushMerge(baseCollected: Record<string, unknown>) {
        const result = validateAndMergeUpdateCarrierSection(
          baseCollected,
          categoryId,
          values,
          referenceByKey,
        );
        if (!result.ok) {
          setClientFieldErrors(result.errors);
          setClientFormLevel(result.formLevelError ?? "");
        } else {
          setClientFieldErrors({});
          setClientFormLevel("");
        }
        return result;
      },
    }),
    [categoryId, referenceByKey, values],
  );

  return (
    <form className="ui-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const base = {
          ...(mergeContextCollected ?? {}),
          carrierCode,
          updateCategory: categoryId,
        };
        const result = validateAndMergeUpdateCarrierSection(
          base,
          categoryId,
          values,
          referenceByKey,
        );
        if (!result.ok) {
          setClientFieldErrors(result.errors);
          setClientFormLevel(result.formLevelError ?? "");
          return;
        }
        setClientFieldErrors({});
        setClientFormLevel("");
        onSubmit(values);
      }}
    >
      <p className="ui-panel-title">Update section</p>
      <p className="ui-panel-desc">
        {hasValidationErrors
          ? "Fix highlighted fields, then submit again."
          : "Change what you need; at least one new value required."}
      </p>
      {formLevelError ? (
        <p className="ui-alert-danger" role="alert">
          {formLevelError}
        </p>
      ) : null}
      <div className="mt-4 space-y-4">
        {form.fields.map((f) => {
          const over = enumOptionsByFieldKey?.[f.key];
          const field =
            over && over.length > 0 ? { ...f, enumOptions: over } : f;
          const err = fieldError(f.key);
          const invalid = Boolean(err);
          const baseInput = "ui-input";
          const border = invalid ? "ui-input-invalid" : "";
          return (
            <div key={f.key}>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={`upd-${f.key}`}
                  className="text-sm font-medium text-foreground"
                >
                  {f.label}
                </label>
                <span
                  className={f.required ? "ui-badge-required" : "ui-badge-optional"}
                >
                  {f.required ? "Required" : "Optional"}
                </span>
              </div>
              {carrierFieldUsesEnumControl(field) ? (
                <CarrierFormEnumControl
                  field={field}
                  idPrefix="upd"
                  value={values[f.key] ?? ""}
                  onChange={(v) => setField(f.key, v)}
                  disabled={disabled}
                  invalid={invalid}
                  errorDescribedBy={
                    invalid ? `upd-err-${f.key}` : undefined
                  }
                />
              ) : field.multiline ? (
                <textarea
                  id={`upd-${f.key}`}
                  name={f.key}
                  rows={3}
                  disabled={disabled}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={`${baseInput} ${border} ui-textarea`}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `upd-err-${f.key}` : undefined}
                />
              ) : (
                <input
                  id={`upd-${f.key}`}
                  name={f.key}
                  type="text"
                  disabled={disabled}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={`${baseInput} ${border}`}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `upd-err-${f.key}` : undefined}
                />
              )}
              {err ? (
                <p
                  id={`upd-err-${f.key}`}
                  className="mt-1.5 text-sm font-medium text-[color:var(--danger-text)]"
                  role="alert"
                >
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {showPrimarySubmit ? (
        <div className="mt-5">
          <button type="submit" disabled={disabled} className="ui-btn-primary">
            {hasValidationErrors ? "Submit corrections" : "Save updates"}
          </button>
        </div>
      ) : null}
    </form>
  );
});
