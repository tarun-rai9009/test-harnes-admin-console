"use client";

import { UpdateCarrierSectionForm } from "@/components/chat/UpdateCarrierSectionForm";
import type { UpdateCarrierFlowPayload } from "@/types/chat-assistant";
import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

function initialMergedFromMultiForm(
  flow: Extract<UpdateCarrierFlowPayload, { step: "multi_section_form" }>,
): Record<string, string> {
  const acc: Record<string, string> = {};
  for (const cf of flow.categoryForms) {
    Object.assign(acc, cf.form.values);
  }
  return acc;
}

function PickCategoryMulti({
  flow,
  disabled,
  onSubmitSelectedCategories,
  onBackToCarrierCode,
}: {
  flow: Extract<UpdateCarrierFlowPayload, { step: "pick_category" }>;
  disabled?: boolean;
  onSubmitSelectedCategories: (categoryIds: string[]) => void;
  onBackToCarrierCode?: () => void;
}) {
  const allIds = useMemo(() => flow.categories.map((c) => c.id), [flow.categories]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allIds));
  const clearAll = () => setSelectedIds(new Set());

  const submitMulti = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (selectedIds.size === 0) return;
    onSubmitSelectedCategories([...selectedIds]);
  };

  return (
    <form className="ui-panel" onSubmit={submitMulti}>
      <p className="ui-panel-title">What to update</p>
      <p className="ui-panel-desc">
        <span className="font-mono font-semibold text-foreground">
          {flow.carrierCode}
        </span>{" "}
        — select one or more sections, then continue.
      </p>
      {onBackToCarrierCode ? (
        <p className="mt-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onBackToCarrierCode}
            className="ui-btn-ghost text-foreground disabled:opacity-50"
          >
            Wrong code?
          </button>
        </p>
      ) : null}
      {flow.categoryError ? (
        <p className="ui-alert-danger" role="alert">
          {flow.categoryError}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={selectAll}
          className="ui-btn-ghost text-sm text-foreground disabled:opacity-50"
        >
          Select all
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={clearAll}
          className="ui-btn-ghost text-sm text-foreground disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {flow.categories.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-accent/35 hover:bg-surface-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                checked={selectedIds.has(c.id)}
                disabled={disabled}
                onChange={() => toggle(c.id)}
              />
              <span>{c.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={disabled || selectedIds.size === 0}
          className="ui-btn-primary"
        >
          Continue
        </button>
      </div>
    </form>
  );
}

function PickCategorySingle({
  flow,
  disabled,
  onSelectCategory,
  onBackToCarrierCode,
}: {
  flow: Extract<UpdateCarrierFlowPayload, { step: "pick_category" }>;
  disabled?: boolean;
  onSelectCategory: (categoryId: string) => void;
  onBackToCarrierCode?: () => void;
}) {
  return (
    <div className="ui-panel">
      <p className="ui-panel-title">What to update</p>
      <p className="ui-panel-desc">
        <span className="font-mono font-semibold text-foreground">
          {flow.carrierCode}
        </span>{" "}
        — pick a section.
      </p>
      {onBackToCarrierCode ? (
        <p className="mt-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onBackToCarrierCode}
            className="ui-btn-ghost text-foreground disabled:opacity-50"
          >
            Wrong code?
          </button>
        </p>
      ) : null}
      {flow.categoryError ? (
        <p className="ui-alert-danger" role="alert">
          {flow.categoryError}
        </p>
      ) : null}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {flow.categories.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectCategory(c.id)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-accent/35 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  flow: UpdateCarrierFlowPayload;
  disabled?: boolean;
  onSubmitCarrierCode: (code: string) => void;
  onSelectCategory: (categoryId: string) => void;
  /** pick_category with multiSelect: submit selected ids. */
  onSubmitSelectedCategories?: (categoryIds: string[]) => void;
  onSubmitSectionForm: (values: Record<string, string>) => void;
  onBackToCarrierCode?: () => void;
  onBackToCategories?: () => void;
};

export function UpdateCarrierFlowPanel({
  flow,
  disabled,
  onSubmitCarrierCode,
  onSelectCategory,
  onSubmitSelectedCategories,
  onSubmitSectionForm,
  onBackToCarrierCode,
  onBackToCategories,
}: Props) {
  const [codeInput, setCodeInput] = useState("");
  const [clientCodeError, setClientCodeError] = useState("");

  useEffect(() => {
    if (flow.step === "need_code") {
      setClientCodeError("");
    }
  }, [flow]);

  const submitCode = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (disabled) return;
      const t = codeInput.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(t)) {
        setClientCodeError("Code must be 4 letters/numbers (e.g. A1B2).");
        return;
      }
      setClientCodeError("");
      onSubmitCarrierCode(t);
    },
    [codeInput, disabled, onSubmitCarrierCode],
  );

  if (flow.step === "need_code") {
    const showErr = clientCodeError || flow.codeError;
    return (
      <form className="ui-panel" onSubmit={submitCode}>
        <p className="ui-panel-title">Update carrier</p>
        <p className="ui-panel-desc">4-character carrier code.</p>
        {showErr ? (
          <p className="ui-alert-danger" role="alert">
            {showErr}
          </p>
        ) : null}
        <label
          htmlFor="upd-carrier-code"
          className="mt-4 block text-sm font-medium text-foreground"
        >
          Carrier code
        </label>
        <input
          id="upd-carrier-code"
          name="carrierCode"
          type="text"
          maxLength={8}
          disabled={disabled}
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          className="ui-input uppercase tracking-widest"
          autoComplete="off"
          placeholder="e.g. A1B2"
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={disabled} className="ui-btn-primary">
            Continue
          </button>
        </div>
      </form>
    );
  }

  if (flow.step === "pick_category") {
    if (flow.multiSelect && onSubmitSelectedCategories) {
      return (
        <PickCategoryMulti
          flow={flow}
          disabled={disabled}
          onSubmitSelectedCategories={onSubmitSelectedCategories}
          onBackToCarrierCode={onBackToCarrierCode}
        />
      );
    }

    return (
      <PickCategorySingle
        flow={flow}
        disabled={disabled}
        onSelectCategory={onSelectCategory}
        onBackToCarrierCode={onBackToCarrierCode}
      />
    );
  }

  if (flow.step === "multi_section_form") {
    return (
      <MultiSectionFormBlock
        flow={flow}
        disabled={disabled}
        onSubmitSectionForm={onSubmitSectionForm}
        onBackToCarrierCode={onBackToCarrierCode}
        onBackToCategories={onBackToCategories}
      />
    );
  }

  if (flow.step === "section_form") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          Updating{" "}
          <span className="font-mono font-semibold">{flow.carrierCode}</span>
          {" · "}
          <span className="font-medium">{flow.categoryLabel}</span>
        </p>
        {onBackToCategories ? (
          <p>
            <button
              type="button"
              disabled={disabled}
              onClick={onBackToCategories}
              className="ui-btn-ghost text-foreground disabled:opacity-50"
            >
              Choose a different section
            </button>
          </p>
        ) : null}
        <UpdateCarrierSectionForm
          form={flow.form}
          carrierCode={flow.carrierCode}
          categoryId={flow.categoryId as UpdateCategoryId}
          disabled={disabled}
          onSubmit={onSubmitSectionForm}
        />
      </div>
    );
  }

  return null;
}

function MultiSectionFormBlock({
  flow,
  disabled,
  onSubmitSectionForm,
  onBackToCarrierCode,
  onBackToCategories,
}: {
  flow: Extract<UpdateCarrierFlowPayload, { step: "multi_section_form" }>;
  disabled?: boolean;
  onSubmitSectionForm: (values: Record<string, string>) => void;
  onBackToCarrierCode?: () => void;
  onBackToCategories?: () => void;
}) {
  const [merged, setMerged] = useState<Record<string, string>>(() =>
    initialMergedFromMultiForm(flow),
  );

  useEffect(() => {
    setMerged(initialMergedFromMultiForm(flow));
  }, [flow]);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (disabled) return;
      onSubmitSectionForm(merged);
    },
    [disabled, merged, onSubmitSectionForm],
  );

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <p className="text-sm font-medium text-foreground">
          Updating{" "}
          <span className="font-mono font-semibold">{flow.carrierCode}</span>
          <span className="text-accent-muted">
            {" "}
            · {flow.categoryForms.length} section
            {flow.categoryForms.length === 1 ? "" : "s"}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {onBackToCategories ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onBackToCategories}
              className="ui-btn-ghost text-foreground disabled:opacity-50"
            >
              Change sections
            </button>
          ) : null}
          {onBackToCarrierCode ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onBackToCarrierCode}
              className="ui-btn-ghost text-foreground disabled:opacity-50"
            >
              Wrong code?
            </button>
          ) : null}
        </div>
      </div>

      {flow.categoryForms.map((cf) => (
        <UpdateCarrierSectionForm
          key={cf.categoryId}
          form={cf.form}
          carrierCode={flow.carrierCode}
          categoryId={cf.categoryId as UpdateCategoryId}
          disabled={disabled}
          hideSubmit
          sectionTitle={cf.categoryLabel}
          idPrefix={`upd-${cf.categoryId}`}
          onValuesChange={(vals) => {
            setMerged((prev) => ({ ...prev, ...vals }));
          }}
          onSubmit={() => {}}
        />
      ))}

      <div className="pt-1">
        <button type="submit" disabled={disabled} className="ui-btn-primary">
          Submit for review
        </button>
      </div>
    </form>
  );
}
