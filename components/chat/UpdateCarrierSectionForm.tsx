"use client";

import {
  CarrierFormEnumControl,
  carrierFieldUsesEnumControl,
} from "@/components/chat/CarrierFormEnumControl";
import type { UpdateCarrierSectionFormState } from "@/types/chat-assistant";
import {
  validateAndMergeUpdateCarrierSection,
} from "@/lib/workflows/update-carrier-section-form";
import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import { useCallback, useEffect, useState } from "react";

type Props = {
  form: UpdateCarrierSectionFormState;
  carrierCode: string;
  categoryId: UpdateCategoryId;
  disabled?: boolean;
  onSubmit: (values: Record<string, string>) => void;
};

export function UpdateCarrierSectionForm({
  form,
  carrierCode,
  categoryId,
  disabled,
  onSubmit,
}: Props) {
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

  return (
    <form className="ui-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const base = {
          carrierCode,
          updateCategory: categoryId,
        };
        const result = validateAndMergeUpdateCarrierSection(
          base,
          categoryId,
          values,
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
              {carrierFieldUsesEnumControl(f) ? (
                <CarrierFormEnumControl
                  field={f}
                  idPrefix="upd"
                  value={values[f.key] ?? ""}
                  onChange={(v) => setField(f.key, v)}
                  disabled={disabled}
                  invalid={invalid}
                  errorDescribedBy={
                    invalid ? `upd-err-${f.key}` : undefined
                  }
                />
              ) : f.multiline ? (
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
      <div className="mt-5">
        <button type="submit" disabled={disabled} className="ui-btn-primary">
          {hasValidationErrors ? "Submit corrections" : "Save updates"}
        </button>
      </div>
    </form>
  );
}
