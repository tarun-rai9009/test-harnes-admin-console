"use client";

import {
  CarrierFormEnumControl,
  carrierFieldUsesEnumControl,
} from "@/components/carrier/CarrierFormEnumControl";
import type { EnumSelectOption } from "@/lib/workflows/carrier-form-enum-ui";
import {
  ME_MATCH_FLAT_KEY,
  ME_MATCH_API_KEY,
  type MultiEntryCategoryId,
} from "@/lib/workflows/update-multi-entry-keys";
import { buildUpdateCarrierSectionFormFields } from "@/lib/workflows/update-carrier-section-form";
import {
  duplicateMultiEntryTypeRowErrors,
  emptyFlatRow,
  getMultiEntrySnapshot,
  incompleteNewMultiEntryTypeErrors,
  type MultiEntryValidateResult,
  validateAndMergeMultiEntrySection,
} from "@/lib/workflows/update-multi-entry-section";
import type { DatapointReferenceMap } from "@/types/zinnia/datapoints";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export type UpdateMultiEntrySectionFormHandle = {
  flushMerge: (baseCollected: Record<string, unknown>) => MultiEntryValidateResult;
};

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
  enumOptionsByFieldKey?: Record<string, EnumSelectOption[]>;
  referenceByKey?: DatapointReferenceMap;
  /** When false, hide the primary submit (parent uses ref.flushMerge). */
  showPrimarySubmit?: boolean;
  onSubmit: (rows: Record<string, string>[]) => void;
};

export const UpdateMultiEntrySectionForm = forwardRef<
  UpdateMultiEntrySectionFormHandle,
  Props
>(function UpdateMultiEntrySectionForm(
  {
    categoryId,
    collected,
    disabled,
    initialRows,
    rowErrors = {},
    formLevelError = "",
    enumOptionsByFieldKey,
    referenceByKey,
    showPrimarySubmit = true,
    onSubmit,
  },
  ref,
) {
  const fields = useMemo(() => {
    const base = buildUpdateCarrierSectionFormFields(categoryId);
    if (!enumOptionsByFieldKey) return base;
    return base.map((f) => {
      const over = enumOptionsByFieldKey[f.key];
      if (over && over.length > 0) return { ...f, enumOptions: over };
      return f;
    });
  }, [categoryId, enumOptionsByFieldKey]);

  const snapshotTypeSet = useMemo(() => {
    const snap = getMultiEntrySnapshot(collected, categoryId);
    const k = ME_MATCH_API_KEY[categoryId];
    return new Set(
      snap
        .map((r) => String(r[k] ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
  }, [collected, categoryId]);

  const idRef = useRef(0);
  const [rows, setRows] = useState<Record<string, string>[]>(initialRows);
  const [rowIds, setRowIds] = useState<number[]>(() =>
    initialRows.map(() => idRef.current++),
  );
  const [localRowErrors, setLocalRowErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [clientFormLevel, setClientFormLevel] = useState("");

  useEffect(() => {
    setRows(initialRows);
    setRowIds(initialRows.map(() => idRef.current++));
    setLocalRowErrors({});
    setClientFormLevel("");
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
    const incomplete = incompleteNewMultiEntryTypeErrors(rows, categoryId);
    const merged = mergeRowErrorMaps(dup, incomplete);
    if (Object.keys(merged).length > 0) {
      setLocalRowErrors(merged);
      return;
    }
    setLocalRowErrors({});
    setRows((prev) => [...prev, emptyFlatRow(categoryId)]);
    setRowIds((prev) => [...prev, idRef.current++]);
  }, [rows, categoryId]);

  const removeRow = useCallback((index: number) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Remove this entry? It will not be included in the update when you save.",
      )
    ) {
      return;
    }
    setLocalRowErrors({});
    setRows((prev) => prev.filter((_, i) => i !== index));
    setRowIds((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const fieldError = (rowIndex: number, key: string) =>
    effectiveRowErrors[rowIndex]?.[key];

  useImperativeHandle(
    ref,
    () => ({
      flushMerge(baseCollected: Record<string, unknown>) {
        const result = validateAndMergeMultiEntrySection(
          baseCollected,
          categoryId,
          rows,
          referenceByKey,
        );
        if (!result.ok) {
          setLocalRowErrors(result.rowErrors);
          setClientFormLevel(result.formLevelError ?? "");
        } else {
          setLocalRowErrors({});
          setClientFormLevel("");
        }
        return result;
      },
    }),
    [categoryId, referenceByKey, rows],
  );

  const mergedFormLevel = formLevelError || clientFormLevel;

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
        across entries (address, phone, email, identifier, or holiday type).
        Edits merge into the loaded row for that type; new types add an entry.
        <strong> Remove</strong> drops an entry from this update (it will not be
        sent to the API). Type is required on any row you fill in.
      </p>
      {mergedFormLevel ? (
        <p className="ui-alert-danger mt-3" role="alert">
          {mergedFormLevel}
        </p>
      ) : null}

      <div className="mt-4 space-y-6">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-surface-muted/30 px-4 py-6 text-center text-sm text-accent-muted">
            No entries in this section. Use <strong>Add entry</strong> to add
            one, or leave empty if you are clearing all (when you save this
            section).
          </p>
        ) : null}
        {rows.map((row, rowIndex) => {
          const mk = ME_MATCH_FLAT_KEY[categoryId];
          const typeKey = (row[mk] ?? "").trim().toLowerCase();
          const loaded =
            typeKey.length > 0 && snapshotTypeSet.has(typeKey);
          const rowKey = rowIds[rowIndex] ?? rowIndex;
          return (
          <div
            key={rowKey}
            className="rounded-xl border border-border bg-surface-muted/40 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-muted">
                Entry {rowIndex + 1}
                {loaded ? " — loaded" : typeKey ? " — new type" : ""}
              </p>
              <button
                type="button"
                className="ui-btn-ghost text-xs"
                disabled={disabled}
                onClick={() => removeRow(rowIndex)}
              >
                Remove entry
              </button>
            </div>
            <div className="space-y-4">
              {fields.map((f) => {
                const ff = f;
                const err = fieldError(rowIndex, ff.key);
                const invalid = Boolean(err);
                const baseInput = "ui-input";
                const border = invalid ? "ui-input-invalid" : "";
                const id = `me-${rowIndex}-${ff.key}`;
                return (
                  <div key={ff.key}>
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={id}
                        className="text-sm font-medium text-foreground"
                      >
                        {ff.label}
                      </label>
                      <span
                        className={
                          ff.required ? "ui-badge-required" : "ui-badge-optional"
                        }
                      >
                        {ff.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    {carrierFieldUsesEnumControl(ff) ? (
                      <CarrierFormEnumControl
                        field={ff}
                        idPrefix={`me-${rowIndex}`}
                        value={row[ff.key] ?? ""}
                        onChange={(v) => setField(rowIndex, ff.key, v)}
                        disabled={disabled}
                        invalid={invalid}
                        errorDescribedBy={
                          invalid ? `${id}-err` : undefined
                        }
                      />
                    ) : ff.multiline ? (
                      <textarea
                        id={id}
                        name={ff.key}
                        rows={3}
                        disabled={disabled}
                        value={row[ff.key] ?? ""}
                        onChange={(e) =>
                          setField(rowIndex, ff.key, e.target.value)
                        }
                        className={`${baseInput} ${border} ui-textarea mt-1`}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? `${id}-err` : undefined}
                      />
                    ) : (
                      <input
                        id={id}
                        name={ff.key}
                        type="text"
                        disabled={disabled}
                        value={row[ff.key] ?? ""}
                        onChange={(e) =>
                          setField(rowIndex, ff.key, e.target.value)
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
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="ui-btn-secondary" disabled={disabled} onClick={addRow}>
          Add entry
        </button>
        {showPrimarySubmit ? (
          <button type="submit" disabled={disabled} className="ui-btn-primary">
            Review update
          </button>
        ) : null}
      </div>
    </form>
  );
});
