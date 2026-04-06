"use client";

import type { CreateCarrierDraftFormField } from "@/types/chat-assistant";

const PLACEHOLDER = "Select an option";

type Props = {
  field: Pick<
    CreateCarrierDraftFormField,
    | "key"
    | "label"
    | "enumOptions"
    | "selectMultiple"
    | "enumCheckboxGroup"
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

  if (field.enumCheckboxGroup && opts.length > 0) {
    const selected = new Set(
      value
        ? value.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );
    const hintId = `${id}-checkbox-hint`;
    const describedBy =
      [invalid && errorDescribedBy, hintId].filter(Boolean).join(" ") ||
      undefined;

    const toggle = (optVal: string, checked: boolean) => {
      const next = new Set(selected);
      if (checked) next.add(optVal);
      else next.delete(optVal);
      const ordered = opts.map((o) => o.value).filter((v) => next.has(v));
      onChange(ordered.join(", "));
    };

    return (
      <fieldset
        className={`mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 shadow-sm outline-none transition ${
          invalid
            ? "ui-input-invalid"
            : "focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/15"
        }`}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <legend className="sr-only">{field.label}</legend>
        <div className="space-y-1.5">
          {opts.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-md px-0.5 py-0.5 text-sm leading-snug text-foreground transition hover:bg-surface-muted/70"
            >
              <input
                type="checkbox"
                name={`${field.key}-${o.value}`}
                className="mt-0.5 size-4 shrink-0 rounded border-border accent-[color:var(--accent)]"
                disabled={disabled}
                checked={selected.has(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <p id={hintId} className="mt-2 text-xs text-accent-muted">
          Select all that apply.
        </p>
      </fieldset>
    );
  }

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
