import { AdminChrome } from "@/components/admin/AdminChrome";
import { LookupCarrierClient } from "@/components/admin/LookupCarrierClient";
import { Suspense } from "react";

export default function LookupCarrierPage() {
  return (
    <AdminChrome title="Look for Carrier with Carrier Code">
      <Suspense
        fallback={
          <p className="text-sm text-accent-muted">Loading…</p>
        }
      >
        <LookupCarrierClient />
      </Suspense>
    </AdminChrome>
  );
}
