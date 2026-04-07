import { AdminChrome } from "@/components/admin/AdminChrome";
import { UpdateCarrierClient } from "@/components/admin/UpdateCarrierClient";
import { Suspense } from "react";

export default function UpdateCarrierPage() {
  return (
    <AdminChrome
      activeService="carrier-master"
      title="Update Carrier"
    >
      <Suspense fallback={<p className="text-sm text-accent-muted">Loading…</p>}>
        <UpdateCarrierClient />
      </Suspense>
    </AdminChrome>
  );
}
