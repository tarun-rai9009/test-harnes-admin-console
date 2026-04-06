"use client";

import type { CreateCarrierDraftFormField } from "@/types/chat-assistant";

const PLACEHOLDER = "Select an option";

type Props = {
  field: Pick<
    CreateCarrierDraftFormField,
    "key" | "enumOptions" | "selectMultiple"
  >;
  idPrefix: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid: boolean;
  /** `aria-describedby` when invalid (field error element id). */
  errorDescribedBy?: string;
};

export function carrierFieldUsesEnumControl(
  f: CreateCarrierDraftFormField,
): boolean {
  return Boolean(f.enumOptions && f.enumOptions.length > 0);
}

export function CarrierFormEnumControl({
  field,
  idPrefix,
  value,
  onChange,
  disabled,
  invalid,
  errorDescribedBy,
}: Props) {
  const baseInput = "ui-input";
  const border = invalid ? "ui-input-invalid" : "";
  const opts = field.enumOptions ?? [];
  const id = `${idPrefix}-${field.key}`;

  if (field.selectMultiple) {
    const selected = value
      ? value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const describedBy = invalid && errorDescribedBy ? errorDescribedBy : undefined;
    const containerClass = `${baseInput} ${border} flex flex-wrap items-center gap-x-5 gap-y-3 py-2.5 min-h-[42px] h-auto`;

    return (
      <div
        id={id}
        className={containerClass}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        {opts.map((o) => {
          const isChecked = selected.includes(o.value);
          return (
            <label
              key={o.value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                name={field.key}
                value={o.value}
                disabled={disabled}
                checked={isChecked}
                onChange={(e) => {
                  let nextSelected;
                  if (e.target.checked) {
                    nextSelected = [...selected, o.value];
                  } else {
                    nextSelected = selected.filter((v) => v !== o.value);
                  }
                  onChange(nextSelected.join(", "));
                }}
                className="h-4 w-4 rounded border-border text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              />
              <span className="text-sm text-foreground/90">{o.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <select
      id={id}
      name={field.key}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} ${border}`}
      aria-invalid={invalid}
      aria-describedby={invalid ? errorDescribedBy : undefined}
    >
      <option value="">{PLACEHOLDER}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
