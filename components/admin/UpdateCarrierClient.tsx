"use client";

import { CarrierDetailSections } from "@/components/carrier/CarrierDetailSections";
import { UpdateMultiEntrySectionForm } from "@/components/carrier/UpdateMultiEntrySectionForm";
import { UpdateCarrierSectionForm } from "@/components/carrier/UpdateCarrierSectionForm";
import { buildUpdateSectionFormStateAdmin } from "@/lib/admin/update-section-form-state";
import { buildUpdateConfirmationRowsFromData } from "@/lib/workflows/definitions/update-carrier-payload";
import {
  UPDATE_CATEGORY_LABELS,
  type UpdateCategoryId,
} from "@/lib/workflows/definitions/update-carrier-constants";
import {
  isMultiEntryCategory,
  ME_PENDING_ROWS_KEY,
} from "@/lib/workflows/update-multi-entry-keys";
import {
  getInitialMultiEntryRows,
  validateAndMergeMultiEntrySection,
} from "@/lib/workflows/update-multi-entry-section";
import {
  buildUpdateSectionFormStateFromStrings,
  isUpdateCategoryVisibleInAdminUi,
  listUpdateCarrierCategories,
  stringValuesForUpdateSection,
  validateAndMergeUpdateCarrierSection,
} from "@/lib/workflows/update-carrier-section-form";
import type { CarrierGetResponse } from "@/types/zinnia/carriers";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Phase =
  | { kind: "code" }
  | { kind: "detail" }
  | { kind: "categories" }
  | { kind: "form"; categoryId: UpdateCategoryId }
  | {
      kind: "confirm";
      categoryId: UpdateCategoryId;
      merged: Record<string, unknown>;
    };

function rowFieldErrorsFromApi(
  raw: unknown,
): Record<number, Record<string, string>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, Record<string, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(k);
    if (!Number.isInteger(idx) || idx < 0) continue;
    if (!v || typeof v !== "object") continue;
    const row: Record<string, string> = {};
    for (const [fk, fv] of Object.entries(v as Record<string, unknown>)) {
      if (typeof fv === "string" && fv.trim()) row[fk] = fv.trim();
    }
    if (Object.keys(row).length > 0) out[idx] = row;
  }
  return out;
}

export function UpdateCarrierClient() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: "code" });
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [carrier, setCarrier] = useState<CarrierGetResponse | null>(null);
  const [collected, setCollected] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [multiEntryErrors, setMultiEntryErrors] = useState<{
    rowErrors: Record<number, Record<string, string>>;
    formLevel?: string;
  } | null>(null);

  const clearPendingMultiEntryRows = useCallback(() => {
    setCollected((c) => {
      const next = { ...c };
      delete next[ME_PENDING_ROWS_KEY];
      return next;
    });
  }, []);

  const activeCode = useMemo(() => {
    const c = carrier?.carrierCode ?? collected.carrierCode;
    return typeof c === "string" ? c.toUpperCase() : "";
  }, [carrier, collected]);

  useEffect(() => {
    const q = searchParams.get("code");
    if (q && /^[A-Za-z0-9]{4}$/.test(q)) {
      setCodeInput((prev) => (prev ? prev : q.toUpperCase()));
    }
  }, [searchParams]);

  const loadCarrier = useCallback(async (code: string) => {
    setLoading(true);
    setCodeError("");
    setSuccessBanner("");
    try {
      const res = await fetch(
        `/api/admin/carriers/${encodeURIComponent(code)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setCodeError(
          typeof data.error === "string" ? data.error : "Request failed.",
        );
        return;
      }
      setCarrier(data.carrier as CarrierGetResponse);
      setCollected(
        (data.collected as Record<string, unknown>) ?? {},
      );
      setPhase({ kind: "detail" });
    } catch {
      setCodeError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitCode = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = codeInput.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(t)) {
        setCodeError("Enter a valid 4-character carrier code.");
        return;
      }
      void loadCarrier(t);
    },
    [codeInput, loadCarrier],
  );

  const refreshAfterUpdate = useCallback(async () => {
    if (!activeCode) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/carriers/${encodeURIComponent(activeCode)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setCarrier(data.carrier as CarrierGetResponse);
        setCollected(
          (data.collected as Record<string, unknown>) ?? {},
        );
      }
    } finally {
      setLoading(false);
    }
  }, [activeCode]);

  const onFormSubmit = useCallback(
    (categoryId: UpdateCategoryId, values: Record<string, string>) => {
      const vr = validateAndMergeUpdateCarrierSection(
        collected,
        categoryId,
        values,
      );
      if (!vr.ok) return;
      setMultiEntryErrors(null);
      setPhase({
        kind: "confirm",
        categoryId,
        merged: vr.merged,
      });
    },
    [collected],
  );

  const onMultiEntrySubmit = useCallback(
    (categoryId: UpdateCategoryId, rows: Record<string, string>[]) => {
      const vr = validateAndMergeMultiEntrySection(collected, categoryId, rows);
      if (!vr.ok) {
        setCollected((c) => ({ ...c, [ME_PENDING_ROWS_KEY]: rows }));
        setMultiEntryErrors({
          rowErrors: vr.rowErrors,
          formLevel: vr.formLevelError,
        });
        return;
      }
      setMultiEntryErrors(null);
      setPhase({
        kind: "confirm",
        categoryId,
        merged: vr.merged,
      });
    },
    [collected],
  );

  const onConfirmPut = useCallback(async () => {
    if (phase.kind !== "confirm") return;
    setLoading(true);
    setSuccessBanner("");
    try {
      const res = await fetch(
        `/api/admin/carriers/${encodeURIComponent(activeCode)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updateCategory: phase.categoryId,
            collectedParams: phase.merged,
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessBanner(
          `${UPDATE_CATEGORY_LABELS[phase.categoryId]} updated.`,
        );
        await refreshAfterUpdate();
        setPhase({ kind: "categories" });
        return;
      }
      const fieldErrors =
        (data.fieldErrors as Record<string, string> | undefined) ?? {};
      const formLevel =
        (data.formLevelMessage as string | undefined) ??
        (typeof data.error === "string" ? data.error : "Update failed.");
      setPhase({
        kind: "form",
        categoryId: phase.categoryId,
      });
      setCollected(phase.merged);
      if (isMultiEntryCategory(phase.categoryId)) {
        setMultiEntryErrors({
          rowErrors: rowFieldErrorsFromApi(data.rowFieldErrors),
          formLevel,
        });
        setFormOverride(null);
      } else {
        setMultiEntryErrors(null);
        setFormOverride(
          buildUpdateSectionFormStateFromStrings(
            phase.categoryId,
            stringValuesForUpdateSection(phase.merged, phase.categoryId),
            fieldErrors,
            Object.keys(fieldErrors).length === 0 ? formLevel : undefined,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [phase, activeCode, refreshAfterUpdate]);

  const [formOverride, setFormOverride] =
    useState<ReturnType<typeof buildUpdateSectionFormStateFromStrings> | null>(
      null,
    );

  useEffect(() => {
    if (
      (phase.kind === "form" || phase.kind === "confirm") &&
      !isUpdateCategoryVisibleInAdminUi(phase.categoryId)
    ) {
      setFormOverride(null);
      setMultiEntryErrors(null);
      setPhase({ kind: "categories" });
    }
  }, [phase]);

  const formState =
    phase.kind === "form"
      ? formOverride ??
        buildUpdateSectionFormStateAdmin(collected, phase.categoryId)
      : null;

  const categories = listUpdateCarrierCategories();

  return (
    <div className="space-y-8">
      {successBanner ? (
        <p
          className="rounded-lg border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]"
          role="status"
        >
          {successBanner}
        </p>
      ) : null}
      {phase.kind === "code" ? (
        <form className="ui-panel max-w-md" onSubmit={submitCode}>
          <p className="ui-panel-title">Carrier code</p>
          <p className="ui-panel-desc">
            Enter the 4-character code to load the carrier and update sections.
          </p>
          {codeError ? (
            <p className="ui-alert-danger mt-3" role="alert">
              {codeError}
            </p>
          ) : null}
          <label
            htmlFor="admin-upd-code"
            className="mt-4 block text-sm font-medium text-foreground"
          >
            Carrier code
          </label>
          <input
            id="admin-upd-code"
            className="ui-input mt-1 uppercase tracking-widest"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            disabled={loading}
          />
          <button
            type="submit"
            className="ui-btn-primary mt-4"
            disabled={loading}
          >
            {loading ? "Loading…" : "Load carrier"}
          </button>
        </form>
      ) : null}

      {phase.kind === "detail" && carrier ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setPhase({ kind: "code" });
                setCarrier(null);
                setCollected({});
                setCodeInput("");
                setFormOverride(null);
                setMultiEntryErrors(null);
                setSuccessBanner("");
              }}
            >
              Change code
            </button>
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => setPhase({ kind: "categories" })}
            >
              Choose section to update
            </button>
          </div>
          <CarrierDetailSections data={carrier} />
        </div>
      ) : null}

      {phase.kind === "categories" && carrier ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => setPhase({ kind: "detail" })}
            >
              Back to details
            </button>
            <button
              type="button"
              className="ui-btn-ghost text-sm text-foreground"
              onClick={() => {
                setPhase({ kind: "code" });
                setCarrier(null);
                setCollected({});
                setCodeInput("");
                setSuccessBanner("");
                setMultiEntryErrors(null);
                setFormOverride(null);
              }}
            >
              Change carrier code
            </button>
          </div>
          <div className="ui-panel">
            <p className="ui-panel-title">Sections</p>
            <p className="ui-panel-desc">
              <span className="font-mono font-semibold">{activeCode}</span> —
              pick one category per update.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium shadow-sm transition hover:border-accent/35 hover:bg-surface-muted disabled:opacity-50"
                    disabled={loading}
                    onClick={() => {
                      setFormOverride(null);
                      setMultiEntryErrors(null);
                      clearPendingMultiEntryRows();
                      setPhase({ kind: "form", categoryId: c.id });
                    }}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {phase.kind === "form" &&
      isMultiEntryCategory(phase.categoryId) ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setFormOverride(null);
                setMultiEntryErrors(null);
                clearPendingMultiEntryRows();
                setPhase({ kind: "categories" });
              }}
            >
              Back to sections
            </button>
            <button
              type="button"
              className="ui-btn-ghost text-sm"
              onClick={() => setPhase({ kind: "detail" })}
            >
              View carrier details
            </button>
          </div>
          <UpdateMultiEntrySectionForm
            key={`${phase.categoryId}-me-${multiEntryErrors ? "err" : "ok"}`}
            categoryId={phase.categoryId}
            collected={collected}
            disabled={loading}
            initialRows={getInitialMultiEntryRows(collected, phase.categoryId)}
            rowErrors={multiEntryErrors?.rowErrors}
            formLevelError={multiEntryErrors?.formLevel ?? ""}
            onSubmit={(rows) => onMultiEntrySubmit(phase.categoryId, rows)}
          />
        </div>
      ) : null}

      {phase.kind === "form" && !isMultiEntryCategory(phase.categoryId) && formState ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setFormOverride(null);
                setMultiEntryErrors(null);
                clearPendingMultiEntryRows();
                setPhase({ kind: "categories" });
              }}
            >
              Back to sections
            </button>
            <button
              type="button"
              className="ui-btn-ghost text-sm"
              onClick={() => setPhase({ kind: "detail" })}
            >
              View carrier details
            </button>
          </div>
          <UpdateCarrierSectionForm
            key={`${phase.categoryId}-${formOverride ? "e" : "n"}`}
            form={formState}
            carrierCode={activeCode}
            categoryId={phase.categoryId}
            disabled={loading}
            onSubmit={(values) => onFormSubmit(phase.categoryId, values)}
          />
        </div>
      ) : null}

      {phase.kind === "confirm" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              disabled={loading}
              onClick={() => {
                setCollected(phase.merged);
                setFormOverride(null);
                setPhase({
                  kind: "form",
                  categoryId: phase.categoryId,
                });
              }}
            >
              Back to edit
            </button>
          </div>
          <div className="ui-card space-y-4">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-accent-muted">
              Review update
            </p>
            <p className="text-sm text-foreground">
              Apply these changes to{" "}
              <span className="font-mono font-semibold">{activeCode}</span>?
            </p>
            <dl className="space-y-3 border-t border-border/60 pt-4">
              {buildUpdateConfirmationRowsFromData(phase.merged).map(
                (row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3"
                  >
                    <dt className="text-sm font-medium text-accent-muted">
                      {row.label}
                    </dt>
                    <dd className="text-sm text-foreground">{row.value}</dd>
                  </div>
                ),
              )}
            </dl>
            <button
              type="button"
              className="ui-btn-primary"
              disabled={loading}
              onClick={() => void onConfirmPut()}
            >
              {loading ? "Saving…" : "Apply update"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
