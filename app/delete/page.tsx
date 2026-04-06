import { AdminChrome } from "@/components/admin/AdminChrome";
import { DeleteCarrierClient } from "@/components/admin/DeleteCarrierClient";
import { Suspense } from "react";

export default function DeleteCarrierPage() {
  return (
    <AdminChrome title="Delete carrier by code">
      <Suspense
        fallback={
          <p className="text-sm text-accent-muted">Loading…</p>
        }
      >
        <DeleteCarrierClient />
      </Suspense>
    </AdminChrome>
  );
}
