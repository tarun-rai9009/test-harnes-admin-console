"use client";

import Link from "next/link";
import { useState } from "react";

export function DeleteCarrierClient() {
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) {
      setError("Enter a valid 4-character carrier code.");
      setSuccessBanner("");
      return;
    }
    if (
      !window.confirm(
        `Delete carrier ${code}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccessBanner("");
    try {
      const res = await fetch(
        `/api/admin/carriers/${encodeURIComponent(code)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        let msg = "Delete failed.";
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data.error === "string") msg = data.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      setCodeInput("");
      setSuccessBanner(`Carrier ${code} was deleted.`);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

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
      <form className="ui-panel max-w-md" onSubmit={onSubmit}>
        <p className="ui-panel-title">Carrier code</p>
        <p className="ui-panel-desc">
          Enter the code of the carrier to delete from Zinnia. This action is
          permanent.
        </p>
        {error ? (
          <p className="ui-alert-danger mt-3" role="alert">
            {error}
          </p>
        ) : null}
        <label
          htmlFor="delete-code"
          className="mt-4 block text-sm font-medium text-foreground"
        >
          Carrier code
        </label>
        <input
          id="delete-code"
          className="ui-input mt-1 uppercase tracking-widest"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          maxLength={8}
          autoComplete="off"
          disabled={loading}
        />
        <button
          type="submit"
          className="ui-btn-danger mt-4"
          disabled={loading}
        >
          {loading ? "Deleting…" : "Delete carrier"}
        </button>
      </form>
      <p className="text-sm text-accent-muted">
        <Link href="/lookup" className="ui-link-inline">
          Look up a carrier first
        </Link>{" "}
        if you want to review details before deleting.
      </p>
    </div>
  );
}
