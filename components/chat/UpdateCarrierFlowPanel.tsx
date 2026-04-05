"use client";

import { UpdateCarrierSectionForm } from "@/components/chat/UpdateCarrierSectionForm";
import type { UpdateCarrierFlowPayload } from "@/types/chat-assistant";
import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Props = {
  flow: UpdateCarrierFlowPayload;
  disabled?: boolean;
  onSubmitCarrierCode: (code: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onSubmitSectionForm: (values: Record<string, string>) => void;
  onBackToCarrierCode?: () => void;
  onBackToCategories?: () => void;
};

export function UpdateCarrierFlowPanel({
  flow,
  disabled,
  onSubmitCarrierCode,
  onSelectCategory,
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
        <label htmlFor="upd-carrier-code" className="mt-4 block text-sm font-medium text-foreground">
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
    return (
      <div className="ui-panel">
        <p className="ui-panel-title">What to update</p>
        <p className="ui-panel-desc">
          <span className="font-mono font-semibold text-foreground">{flow.carrierCode}</span> — pick a section.
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
