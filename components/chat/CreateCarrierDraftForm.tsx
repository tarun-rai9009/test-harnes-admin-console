"use client";

import {
  CarrierFormEnumControl,
  carrierFieldUsesEnumControl,
} from "@/components/chat/CarrierFormEnumControl";
import type { CreateCarrierDraftFormState } from "@/types/chat-assistant";
import { validateCreateCarrierDraftFormValues } from "@/lib/workflows/create-carrier-draft-validate";
import { useCallback, useEffect, useState } from "react";

type Props = {
  form: CreateCarrierDraftFormState;
  disabled?: boolean;
  onSubmit: (values: Record<string, string>) => void;
};

export function CreateCarrierDraftForm({
  form,
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
    <form
      className="ui-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const result = validateCreateCarrierDraftFormValues(values);
        if (!result.ok) {
          setClientFieldErrors(result.errors);
          setClientFormLevel("");
          return;
        }
        setClientFieldErrors({});
        setClientFormLevel("");
        onSubmit(values);
      }}
    >
      <p className="ui-panel-title">Carrier draft details</p>
      <p className="ui-panel-desc">
        {hasValidationErrors
          ? "Fix highlighted fields, then submit again."
          : "Required fields must be filled; optional can be empty."}
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
                  htmlFor={`draft-${f.key}`}
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
                  idPrefix="draft"
                  value={values[f.key] ?? ""}
                  onChange={(v) => setField(f.key, v)}
                  disabled={disabled}
                  invalid={invalid}
                  errorDescribedBy={invalid ? `err-${f.key}` : undefined}
                />
              ) : f.multiline ? (
                <textarea
                  id={`draft-${f.key}`}
                  name={f.key}
                  rows={3}
                  disabled={disabled}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={`${baseInput} ${border} ui-textarea`}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `err-${f.key}` : undefined}
                />
              ) : (
                <input
                  id={`draft-${f.key}`}
                  name={f.key}
                  type="text"
                  disabled={disabled}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={`${baseInput} ${border}`}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `err-${f.key}` : undefined}
                />
              )}
              {err ? (
                <p
                  id={`err-${f.key}`}
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
          {hasValidationErrors ? "Submit corrections" : "Create carrier draft"}
        </button>
      </div>
    </form>
  );
}
