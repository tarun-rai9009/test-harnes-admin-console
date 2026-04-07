"use client";

import type { CarrierSummary } from "@/types/zinnia/carriers";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CarrierListClient() {
  const [rows, setRows] = useState<CarrierSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/carriers");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(
            typeof data.error === "string" ? data.error : "Failed to load list.",
          );
          setRows([]);
          return;
        }
        setRows((data.carriers as CarrierSummary[]) ?? []);
      } catch {
        if (!cancelled) {
          setError("Network error.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-accent-muted">Loading carriers…</p>;
  }
  if (error) {
    return (
      <p className="ui-alert-danger" role="alert">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-accent-muted">No carriers returned.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[var(--card-shadow-sm)]">
      <table className="w-full min-w-[360px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-4 py-3 font-semibold text-foreground">Code</th>
            <th className="px-4 py-3 font-semibold text-foreground">Name</th>
            <th className="px-4 py-3 font-semibold text-foreground">Status</th>
            <th className="px-4 py-3 font-semibold text-foreground"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.carrierCode}-${i}`}
              className="border-b border-border/80 last:border-0 odd:bg-surface-muted/40"
            >
              <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                {r.carrierCode}
              </td>
              <td className="px-4 py-2.5 text-foreground">{r.carrierName}</td>
              <td className="px-4 py-2.5 text-accent-muted">
                {r.status ?? "—"}
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/carrier-master/lookup?code=${encodeURIComponent(r.carrierCode)}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
