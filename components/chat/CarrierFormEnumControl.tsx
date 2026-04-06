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
    const size = Math.min(8, Math.max(3, opts.length));
    const multiHint = `${id}-multi-hint`;
    const describedBy =
      [invalid && errorDescribedBy, multiHint].filter(Boolean).join(" ") ||
      undefined;
    return (
      <div>
        <select
          id={id}
          name={field.key}
          multiple
          size={size}
          disabled={disabled}
          value={selected}
          onChange={(e) => {
            const next = Array.from(
              e.target.selectedOptions,
              (o) => o.value,
            );
            onChange(next.join(", "));
          }}
          className={`${baseInput} ${border} min-h-[6.5rem] py-1`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p id={multiHint} className="mt-1 text-xs text-accent-muted">
          Hold Ctrl (Windows) or ⌘ (Mac) to select multiple.
        </p>
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
