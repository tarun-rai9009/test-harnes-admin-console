"use client";

import { CarrierDetailSections } from "@/components/carrier/CarrierDetailSections";
import { CreateCarrierDraftForm } from "@/components/carrier/CreateCarrierDraftForm";
import {
  buildCreateCarrierDraftFormState,
  mergeCreateCarrierDraftFormIntoCollected,
} from "@/lib/workflows/create-carrier-draft-form-utils";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

function carrierCodeFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }
  const c = (payload as Record<string, unknown>).carrierCode;
  return typeof c === "string" ? c.trim().toUpperCase() : "";
}

export function CreateCarrierPageClient() {
  const [form, setForm] = useState(() =>
    buildCreateCarrierDraftFormState({}, {}, undefined),
  );
  const [loading, setLoading] = useState(false);
  const [successPayload, setSuccessPayload] = useState<unknown>(null);

  const onSubmit = useCallback(async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/carriers/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await res.json();
      if (res.ok && data.ok === true) {
        setSuccessPayload(data.carrier);
        return;
      }
      const merged = mergeCreateCarrierDraftFormIntoCollected({}, values);
      setForm(
        buildCreateCarrierDraftFormState(
          merged,
          (data.fieldErrors as Record<string, string>) ?? {},
          (data.formLevelMessage as string | undefined) ??
            (typeof data.message === "string" ? data.message : undefined),
        ),
      );
    } catch {
      const merged = mergeCreateCarrierDraftFormIntoCollected({}, values);
      setForm(
        buildCreateCarrierDraftFormState(
          merged,
          {},
          "Request failed. Check connection.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const successCode = useMemo(
    () => carrierCodeFromPayload(successPayload),
    [successPayload],
  );
  const canUpdate =
    successCode.length === 4 && /^[A-Z0-9]{4}$/.test(successCode);

  if (successPayload) {
    return (
      <div className="space-y-6">
        <p
          className="rounded-lg border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]"
          role="status"
        >
          Draft created successfully.
        </p>
        <CarrierDetailSections data={successPayload} variant="basic" />
        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Link
              href={`/update?code=${encodeURIComponent(successCode)}`}
              className="ui-btn-primary inline-flex shrink-0 items-center justify-center no-underline"
            >
              Update carrier
            </Link>
          ) : null}
          <button
            type="button"
            className="ui-btn-secondary"
            onClick={() => {
              setSuccessPayload(null);
              setForm(buildCreateCarrierDraftFormState({}, {}, undefined));
            }}
          >
            Create another carrier
          </button>
        </div>
      </div>
    );
  }

  return (
    <CreateCarrierDraftForm form={form} disabled={loading} onSubmit={onSubmit} />
  );
}
