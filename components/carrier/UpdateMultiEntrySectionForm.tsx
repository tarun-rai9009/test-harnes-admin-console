"use client";

import {
  CarrierFormEnumControl,
  carrierFieldUsesEnumControl,
} from "@/components/carrier/CarrierFormEnumControl";
import type { MultiEntryCategoryId } from "@/lib/workflows/update-multi-entry-keys";
import { buildUpdateCarrierSectionFormFields } from "@/lib/workflows/update-carrier-section-form";
import {
  duplicateMultiEntryTypeRowErrors,
  emptyFlatRow,
  getMultiEntrySnapshot,
  incompleteNewMultiEntryTypeErrors,
} from "@/lib/workflows/update-multi-entry-section";
import { useCallback, useEffect, useMemo, useState } from "react";

function mergeRowErrorMaps(
  a: Record<number, Record<string, string>>,
  b: Record<number, Record<string, string>>,
): Record<number, Record<string, string>> {
  const idxs = new Set([
    ...Object.keys(a).map(Number),
    ...Object.keys(b).map(Number),
  ]);
  const out: Record<number, Record<string, string>> = {};
  for (const i of idxs) {
    out[i] = { ...(a[i] ?? {}), ...(b[i] ?? {}) };
  }
  return out;
}

type Props = {
  categoryId: MultiEntryCategoryId;
  collected: Record<string, unknown>;
  disabled?: boolean;
  /** Controlled initial rows (from snapshot, pending save, or error recovery). */
  initialRows: Record<string, string>[];
  rowErrors?: Record<number, Record<string, string>>;
  formLevelError?: string;
  onSubmit: (rows: Record<string, string>[]) => void;
};

export function UpdateMultiEntrySectionForm({
  categoryId,
  collected,
  disabled,
  initialRows,
  rowErrors = {},
  formLevelError = "",
  onSubmit,
}: Props) {
  const fields = useMemo(
    () => buildUpdateCarrierSectionFormFields(categoryId),
    [categoryId],
  );

  const snapshotLength = useMemo(
    () => getMultiEntrySnapshot(collected, categoryId).length,
    [collected, categoryId],
  );

  const [rows, setRows] = useState<Record<string, string>[]>(initialRows);
  const [localRowErrors, setLocalRowErrors] = useState<
    Record<number, Record<string, string>>
  >({});

  useEffect(() => {
    setRows(initialRows);
    setLocalRowErrors({});
  }, [initialRows]);

  const effectiveRowErrors = useMemo(() => {
    const idxs = new Set([
      ...Object.keys(rowErrors).map(Number),
      ...Object.keys(localRowErrors).map(Number),
    ]);
    const merged: Record<number, Record<string, string>> = {};
    for (const i of idxs) {
      const loc = localRowErrors[i];
      const prop = rowErrors[i];
      const keys = new Set([
        ...(loc ? Object.keys(loc) : []),
        ...(prop ? Object.keys(prop) : []),
      ]);
      const row: Record<string, string> = {};
      for (const k of keys) {
        const v = loc?.[k] ?? prop?.[k];
        if (v) row[k] = v;
      }
      if (Object.keys(row).length > 0) merged[i] = row;
    }
    return merged;
  }, [rowErrors, localRowErrors]);

  const setField = useCallback(
    (rowIndex: number, key: string, v: string) => {
      setLocalRowErrors({});
      setRows((prev) => {
        const next = prev.map((r, i) =>
          i === rowIndex ? { ...r, [key]: v } : r,
        );
        return next;
      });
    },
    [],
  );

  const addRow = useCallback(() => {
    const dup = duplicateMultiEntryTypeRowErrors(rows, categoryId);
    const incomplete = incompleteNewMultiEntryTypeErrors(
      rows,
      categoryId,
      snapshotLength,
    );
    const merged = mergeRowErrorMaps(dup, incomplete);
    if (Object.keys(merged).length > 0) {
      setLocalRowErrors(merged);
      return;
    }
    setLocalRowErrors({});
    setRows((prev) => [...prev, emptyFlatRow(categoryId)]);
  }, [rows, categoryId, snapshotLength]);

  const removeRow = useCallback(
    (index: number) => {
      if (rows.length <= 1) return;
      if (index < snapshotLength) return;
      setLocalRowErrors({});
      setRows((prev) => prev.filter((_, i) => i !== index));
    },
    [rows.length, snapshotLength],
  );

  const fieldError = (rowIndex: number, key: string) =>
    effectiveRowErrors[rowIndex]?.[key];

  return (
    <form
      className="ui-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit(rows);
      }}
    >
      <p className="ui-panel-title">Update section (multiple entries)</p>
      <p className="ui-panel-desc">
        Each card is one entry. Each <strong>type</strong> may appear only once
        across entries. Rows match on type (address / phone / email / identifier
        type): same type updates the existing record; a new type adds an entry.
        Type is required on any row you fill in.
      </p>
      {formLevelError ? (
        <p className="ui-alert-danger mt-3" role="alert">
          {formLevelError}
        </p>
      ) : null}

      <div className="mt-4 space-y-6">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="rounded-xl border border-border bg-surface-muted/40 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-muted">
                Entry {rowIndex + 1}
                {rowIndex < snapshotLength
                  ? " (existing)"
                  : " (new)"}
              </p>
              {rowIndex >= snapshotLength && rows.length > 1 ? (
                <button
                  type="button"
                  className="ui-btn-ghost text-xs"
                  disabled={disabled}
                  onClick={() => removeRow(rowIndex)}
                >
                  Remove entry
                </button>
              ) : null}
            </div>
            <div className="space-y-4">
              {fields.map((f) => {
                const err = fieldError(rowIndex, f.key);
                const invalid = Boolean(err);
                const baseInput = "ui-input";
                const border = invalid ? "ui-input-invalid" : "";
                const id = `me-${rowIndex}-${f.key}`;
                return (
                  <div key={f.key}>
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={id}
                        className="text-sm font-medium text-foreground"
                      >
                        {f.label}
                      </label>
                      <span
                        className={
                          f.required ? "ui-badge-required" : "ui-badge-optional"
                        }
                      >
                        {f.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    {carrierFieldUsesEnumControl(f) ? (
                      <CarrierFormEnumControl
                        field={f}
                        idPrefix={`me-${rowIndex}`}
                        value={row[f.key] ?? ""}
                        onChange={(v) => setField(rowIndex, f.key, v)}
                        disabled={disabled}
                        invalid={invalid}
                        errorDescribedBy={
                          invalid ? `${id}-err` : undefined
                        }
                      />
                    ) : f.multiline ? (
                      <textarea
                        id={id}
                        name={f.key}
                        rows={3}
                        disabled={disabled}
                        value={row[f.key] ?? ""}
                        onChange={(e) =>
                          setField(rowIndex, f.key, e.target.value)
                        }
                        className={`${baseInput} ${border} ui-textarea mt-1`}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? `${id}-err` : undefined}
                      />
                    ) : (
                      <input
                        id={id}
                        name={f.key}
                        type="text"
                        disabled={disabled}
                        value={row[f.key] ?? ""}
                        onChange={(e) =>
                          setField(rowIndex, f.key, e.target.value)
                        }
                        className={`${baseInput} ${border} mt-1`}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? `${id}-err` : undefined}
                      />
                    )}
                    {err ? (
                      <p
                        id={`${id}-err`}
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
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="ui-btn-secondary" disabled={disabled} onClick={addRow}>
          Add entry
        </button>
        <button type="submit" disabled={disabled} className="ui-btn-primary">
          Review update
        </button>
      </div>
    </form>
  );
}
