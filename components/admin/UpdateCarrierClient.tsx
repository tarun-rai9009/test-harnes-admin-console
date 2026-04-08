"use client";

import { carrierGetResponseToCollectedParams } from "@/lib/admin/carrier-get-response-to-collected";
import {
  distributeFieldErrorsByUpdateCategory,
  primaryMultiEntryCategoryForRowErrors,
} from "@/lib/admin/update-carrier-flat-field-to-category";
import { takeUpdateCarrierSessionBootstrap } from "@/lib/admin/update-carrier-session-bootstrap";
import { buildUpdateSectionFormStateAdmin } from "@/lib/admin/update-section-form-state";
import { CarrierDetailSections } from "@/components/carrier/CarrierDetailSections";
import {
  type UpdateMultiEntrySectionFormHandle,
  UpdateMultiEntrySectionForm,
} from "@/components/carrier/UpdateMultiEntrySectionForm";
import {
  type UpdateCarrierSectionFormHandle,
  UpdateCarrierSectionForm,
} from "@/components/carrier/UpdateCarrierSectionForm";
import { buildEnumOptionsByFieldKey } from "@/lib/datapoints/enum-options-from-reference";
import {
  UPDATE_CATEGORY_LABELS,
  UPDATE_CATEGORY_ORDER,
  type UpdateCategoryId,
} from "@/lib/workflows/definitions/update-carrier-constants";
import { getUpdateCarrierNoChangesMessage } from "@/lib/workflows/definitions/update-carrier-catalog";
import { buildUpdateConfirmationRowsFromMultiCategoryData } from "@/lib/workflows/definitions/update-carrier-payload";
import {
  isMultiEntryCategory,
  ME_PENDING_ROWS_KEY,
  type MultiEntryCategoryId,
} from "@/lib/workflows/update-multi-entry-keys";
import {
  getInitialMultiEntryRows,
  type MultiEntryValidateResult,
} from "@/lib/workflows/update-multi-entry-section";
import {
  buildUpdateSectionFormStateFromStrings,
  isUpdateCategoryVisibleInAdminUi,
  listUpdateCarrierCategories,
  stringValuesForUpdateSection,
  type ValidateSectionResult,
} from "@/lib/workflows/update-carrier-section-form";
import type { CarrierGetResponse } from "@/types/zinnia/carriers";
import type { UpdateCarrierSectionFormState } from "@/types/carrier-forms";
import type { DatapointReferenceMap } from "@/types/zinnia/datapoints";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Phase =
  | { kind: "code" }
  | { kind: "detail" }
  | { kind: "edit" }
  | {
      kind: "confirm";
      merged: Record<string, unknown>;
      updateCategoriesApplied: UpdateCategoryId[];
    };

type SectionFlushRef =
  | UpdateCarrierSectionFormHandle
  | UpdateMultiEntrySectionFormHandle;

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

function isNoChangesFailure(
  r: ValidateSectionResult | MultiEntryValidateResult,
  noChangeMsg: string,
): boolean {
  if (r.ok) return false;
  if ("rowErrors" in r) {
    return (
      Object.keys(r.rowErrors).length === 0 &&
      (r.formLevelError ?? "") === noChangeMsg
    );
  }
  return (
    Object.keys(r.errors).length === 0 &&
    (r.formLevelError ?? "") === noChangeMsg
  );
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
  const [reviewHint, setReviewHint] = useState("");
  const [sectionOpen, setSectionOpen] = useState<
    Partial<Record<UpdateCategoryId, boolean>>
  >({});
  const [editNonce, setEditNonce] = useState(0);
  const [referenceByKey, setReferenceByKey] = useState<DatapointReferenceMap>(
    {},
  );
  const [editSingleOverrides, setEditSingleOverrides] = useState<
    Partial<Record<UpdateCategoryId, UpdateCarrierSectionFormState>>
  >({});
  const [editMultiErrors, setEditMultiErrors] = useState<
    Partial<
      Record<
        MultiEntryCategoryId,
        { rowErrors: Record<number, Record<string, string>>; formLevel?: string }
      >
    >
  >({});

  const sectionRefs = useRef<Partial<Record<UpdateCategoryId, SectionFlushRef | null>>>(
    {},
  );
  const noChangesMessage = useMemo(() => getUpdateCarrierNoChangesMessage(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/datapoints");
        const data = (await res.json()) as {
          referenceByKey?: DatapointReferenceMap;
        };
        if (cancelled || !res.ok) return;
        if (data.referenceByKey && typeof data.referenceByKey === "object") {
          setReferenceByKey(data.referenceByKey);
        }
      } catch {
        /* keep empty — forms fall back to OpenAPI enums */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enumOptionsByFieldKey = useMemo(
    () => buildEnumOptionsByFieldKey(referenceByKey),
    [referenceByKey],
  );

  const clearPendingMultiEntryRows = useCallback(() => {
    setCollected((c) => {
      const next = { ...c };
      delete next[ME_PENDING_ROWS_KEY];
      return next;
    });
  }, []);

  const resetEditSurface = useCallback(() => {
    setEditSingleOverrides({});
    setEditMultiErrors({});
    setReviewHint("");
    setSectionOpen({});
    sectionRefs.current = {};
    setEditNonce((n) => n + 1);
  }, []);

  const activeCode = useMemo(() => {
    const c = carrier?.carrierCode ?? collected.carrierCode;
    return typeof c === "string" ? c.toUpperCase() : "";
  }, [carrier, collected]);

  const urlCarrierCode = useMemo(() => {
    const q = searchParams.get("code");
    if (!q || !/^[A-Za-z0-9]{4}$/.test(q)) return null;
    return q.toUpperCase();
  }, [searchParams]);

  const loadCarrier = useCallback(
    async (
      code: string,
      options?: {
        afterLoad?: "detail" | "edit";
        signal?: AbortSignal;
      },
    ) => {
      const afterLoad = options?.afterLoad ?? "detail";
      const signal = options?.signal;
      setLoading(true);
      setCodeError("");
      setSuccessBanner("");
      try {
        const res = await fetch(
          `/api/admin/carriers/${encodeURIComponent(code)}`,
          { signal },
        );
        const data = await res.json();
        if (signal?.aborted) return;
        if (!res.ok) {
          setCodeError(
            typeof data.error === "string" ? data.error : "Request failed.",
          );
          return;
        }
        setCarrier(data.carrier as CarrierGetResponse);
        let nextCollected =
          (data.collected as Record<string, unknown>) ?? {};
        if (afterLoad === "edit") {
          nextCollected = { ...nextCollected };
          delete nextCollected[ME_PENDING_ROWS_KEY];
          resetEditSurface();
          setPhase({ kind: "edit" });
        } else {
          setPhase({ kind: "detail" });
        }
        setCollected(nextCollected);
      } catch (e) {
        if (
          signal?.aborted ||
          (e instanceof DOMException && e.name === "AbortError")
        )
          return;
        setCodeError("Network error.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [resetEditSurface],
  );

  useEffect(() => {
    if (!urlCarrierCode) return;
    setCodeInput(urlCarrierCode);

    const boot = takeUpdateCarrierSessionBootstrap(urlCarrierCode);
    if (boot) {
      resetEditSurface();
      setCarrier(boot);
      setCodeError("");
      setSuccessBanner("");
      const collectedParams = carrierGetResponseToCollectedParams(boot);
      const next: Record<string, unknown> = { ...collectedParams };
      delete next[ME_PENDING_ROWS_KEY];
      setCollected(next);
      setPhase({ kind: "edit" });
      return;
    }

    const ac = new AbortController();
    void loadCarrier(urlCarrierCode, { afterLoad: "edit", signal: ac.signal });
    return () => ac.abort();
  }, [urlCarrierCode, loadCarrier, resetEditSurface]);

  useEffect(() => {
    if (urlCarrierCode) return;
    setLoading(false);
  }, [urlCarrierCode]);

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

  const runReviewChanges = useCallback(() => {
    setReviewHint("");
    let acc = { ...collected };
    const applied: UpdateCategoryId[] = [];
    const failedCategories: UpdateCategoryId[] = [];

    for (const cat of UPDATE_CATEGORY_ORDER) {
      if (!isUpdateCategoryVisibleInAdminUi(cat)) continue;
      const ref = sectionRefs.current[cat];
      if (!ref) continue;
      const r = ref.flushMerge(acc);
      if (r.ok) {
        acc = r.merged;
        applied.push(cat);
        continue;
      }
      if (isNoChangesFailure(r, noChangesMessage)) continue;
      failedCategories.push(cat);
    }

    if (failedCategories.length > 0) {
      const labels = failedCategories.map((id) => UPDATE_CATEGORY_LABELS[id]);
      setReviewHint(
        labels.length === 1
          ? `“${labels[0]}” has validation errors. That section is expanded below — fix the fields, then try Review changes again.`
          : `These sections have validation errors (expanded below): ${labels.join(", ")}. Fix the fields, then try Review changes again.`,
      );
      setSectionOpen((prev) => {
        const next = { ...prev };
        for (const id of failedCategories) next[id] = true;
        return next;
      });
      const firstId = failedCategories[0]!;
      window.setTimeout(() => {
        document
          .getElementById(`update-carrier-section-${firstId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }
    if (applied.length === 0) {
      setReviewHint(
        "No changes to apply. Edit at least one section, then try again.",
      );
      return;
    }

    setPhase({
      kind: "confirm",
      merged: acc,
      updateCategoriesApplied: applied,
    });
  }, [collected, noChangesMessage]);

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
            updateCategories: phase.updateCategoriesApplied,
            collectedParams: phase.merged,
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        const labels = phase.updateCategoriesApplied.map(
          (id) => UPDATE_CATEGORY_LABELS[id],
        );
        setSuccessBanner(
          labels.length === 1
            ? `${labels[0]} updated.`
            : `Updated: ${labels.join(", ")}.`,
        );
        await refreshAfterUpdate();
        resetEditSurface();
        setPhase({ kind: "detail" });
        return;
      }
      const fieldErrors =
        (data.fieldErrors as Record<string, string> | undefined) ?? {};
      const formLevel =
        (data.formLevelMessage as string | undefined) ??
        (typeof data.error === "string" ? data.error : "Update failed.");
      const applied = phase.updateCategoriesApplied;
      const merged = phase.merged;
      setPhase({ kind: "edit" });
      setCollected(merged);
      setEditNonce((n) => n + 1);

      const byCat = distributeFieldErrorsByUpdateCategory(fieldErrors);
      const nextSingle: Partial<
        Record<UpdateCategoryId, UpdateCarrierSectionFormState>
      > = {};
      for (const cat of applied) {
        if (isMultiEntryCategory(cat)) continue;
        const errs = byCat[cat] ?? {};
        nextSingle[cat] = buildUpdateSectionFormStateFromStrings(
          cat,
          stringValuesForUpdateSection(merged, cat),
          errs,
          Object.keys(errs).length === 0 ? formLevel : undefined,
        );
      }

      const rowApi = rowFieldErrorsFromApi(data.rowFieldErrors);
      const meCat = primaryMultiEntryCategoryForRowErrors(applied);
      if (
        formLevel.trim() &&
        Object.keys(byCat).length === 0 &&
        Object.keys(rowApi).length === 0 &&
        applied.length > 0
      ) {
        const first = applied[0]!;
        if (isMultiEntryCategory(first)) {
          setEditMultiErrors({
            [first]: { rowErrors: {}, formLevel },
          });
          setEditSingleOverrides(nextSingle);
        } else {
          setEditMultiErrors({});
          setEditSingleOverrides({
            ...nextSingle,
            [first]: buildUpdateSectionFormStateFromStrings(
              first,
              stringValuesForUpdateSection(merged, first),
              {},
              formLevel,
            ),
          });
        }
      } else {
        setEditSingleOverrides(nextSingle);
        if (meCat && (Object.keys(rowApi).length > 0 || formLevel.trim())) {
          setEditMultiErrors({
            [meCat]: {
              rowErrors: rowApi,
              ...(formLevel.trim() ? { formLevel } : {}),
            },
          });
        } else {
          setEditMultiErrors({});
        }
      }
    } finally {
      setLoading(false);
    }
  }, [phase, activeCode, refreshAfterUpdate, resetEditSurface]);

  const categories = listUpdateCarrierCategories();

  const bindSectionRef = useCallback(
    (categoryId: UpdateCategoryId, el: SectionFlushRef | null) => {
      if (el) sectionRefs.current[categoryId] = el;
      else delete sectionRefs.current[categoryId];
    },
    [],
  );

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
                resetEditSurface();
                setSuccessBanner("");
              }}
            >
              Change code
            </button>
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => {
                resetEditSurface();
                clearPendingMultiEntryRows();
                setPhase({ kind: "edit" });
              }}
            >
              Update carrier
            </button>
          </div>
          <CarrierDetailSections data={carrier} />
        </div>
      ) : null}

      {phase.kind === "edit" && carrier ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                resetEditSurface();
                setPhase({ kind: "detail" });
              }}
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
                resetEditSurface();
              }}
            >
              Change carrier code
            </button>
          </div>

          <div className="ui-panel">
            <p className="ui-panel-title">Choose update section(s)</p>
            <p className="ui-panel-desc">
              <span className="font-mono font-semibold">{activeCode}</span> —
              expand any sections you need. Use <strong>Review changes</strong>{" "}
              when ready; multiple sections can be updated in one save.
            </p>
            {reviewHint ? (
              <p className="ui-alert-danger mt-3" role="status">
                {reviewHint}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {categories.map((c) => (
              <details
                id={`update-carrier-section-${c.id}`}
                key={`${c.id}-${editNonce}`}
                open={Boolean(sectionOpen[c.id])}
                onToggle={(e) => {
                  const el = e.currentTarget;
                  setSectionOpen((prev) => ({ ...prev, [c.id]: el.open }));
                }}
                className="group rounded-xl border border-border bg-surface shadow-sm open:shadow-md"
              >
                <summary className="cursor-pointer list-none px-4 py-3 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span>{c.label}</span>
                    <span className="text-xs font-normal text-accent-muted group-open:hidden">
                      Expand
                    </span>
                    <span className="hidden text-xs font-normal text-accent-muted group-open:inline">
                      Collapse
                    </span>
                  </span>
                </summary>
                <div className="border-t border-border/60 px-2 pb-4 pt-2">
                  {isMultiEntryCategory(c.id) ? (
                    <UpdateMultiEntrySectionForm
                      ref={(el) => bindSectionRef(c.id, el)}
                      categoryId={c.id}
                      collected={collected}
                      disabled={loading}
                      initialRows={getInitialMultiEntryRows(collected, c.id)}
                      rowErrors={editMultiErrors[c.id]?.rowErrors}
                      formLevelError={editMultiErrors[c.id]?.formLevel ?? ""}
                      enumOptionsByFieldKey={enumOptionsByFieldKey}
                      referenceByKey={referenceByKey}
                      showPrimarySubmit={false}
                      onSubmit={() => {}}
                    />
                  ) : (
                    <UpdateCarrierSectionForm
                      ref={(el) => bindSectionRef(c.id, el)}
                      form={
                        editSingleOverrides[c.id] ??
                        buildUpdateSectionFormStateAdmin(collected, c.id)
                      }
                      carrierCode={activeCode}
                      categoryId={c.id}
                      disabled={loading}
                      enumOptionsByFieldKey={enumOptionsByFieldKey}
                      referenceByKey={referenceByKey}
                      mergeContextCollected={collected}
                      showPrimarySubmit={false}
                      onSubmit={() => {}}
                    />
                  )}
                </div>
              </details>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-primary"
              disabled={loading}
              onClick={runReviewChanges}
            >
              Review changes
            </button>
          </div>
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
                setPhase({ kind: "edit" });
                setEditNonce((n) => n + 1);
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
              {buildUpdateConfirmationRowsFromMultiCategoryData(
                phase.merged,
                phase.updateCategoriesApplied,
              ).map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3"
                >
                  <dt className="text-sm font-medium text-accent-muted">
                    {row.label}
                  </dt>
                  <dd className="text-sm text-foreground">{row.value}</dd>
                </div>
              ))}
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
