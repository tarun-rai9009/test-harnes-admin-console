"use client";

import { CarrierDetailSections } from "@/components/carrier/CarrierDetailSections";
import type { CarrierGetResponse } from "@/types/zinnia/carriers";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function LookupCarrierClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preset = searchParams.get("code");

  const [codeInput, setCodeInput] = useState(preset?.toUpperCase() ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [carrier, setCarrier] = useState<CarrierGetResponse | null>(null);

  const load = useCallback(async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/carriers/${encodeURIComponent(code)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setCarrier(null);
        setError(
          typeof data.error === "string" ? data.error : "Lookup failed.",
        );
        return;
      }
      setCarrier(data.carrier as CarrierGetResponse);
    } catch {
      setCarrier(null);
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preset && /^[A-Za-z0-9]{4}$/.test(preset)) {
      setCodeInput(preset.toUpperCase());
      void load(preset.toUpperCase());
    }
  }, [preset, load]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = codeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(t)) {
      setError("Enter a valid 4-character carrier code.");
      setCarrier(null);
      return;
    }
    router.replace(`/lookup?code=${encodeURIComponent(t)}`);
    void load(t);
  }

  return (
    <div className="space-y-8">
      <form className="ui-panel max-w-md" onSubmit={onSubmit}>
        <p className="ui-panel-title">Carrier code</p>
        <p className="ui-panel-desc">Load full carrier details from Zinnia.</p>
        {error ? (
          <p className="ui-alert-danger mt-3" role="alert">
            {error}
          </p>
        ) : null}
        <label
          htmlFor="lookup-code"
          className="mt-4 block text-sm font-medium text-foreground"
        >
          Carrier code
        </label>
        <input
          id="lookup-code"
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
          {loading ? "Loading…" : "Get details"}
        </button>
      </form>

      {carrier ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setCarrier(null);
                setCodeInput("");
                setError("");
                router.replace("/lookup");
              }}
            >
              Search again
            </button>
            <Link
              href={`/update?code=${encodeURIComponent(carrier.carrierCode)}`}
              className="ui-btn-secondary inline-flex shrink-0 items-center justify-center no-underline"
            >
              Update this carrier
            </Link>
          </div>
          <CarrierDetailSections data={carrier} />
        </div>
      ) : null}
    </div>
  );
}
