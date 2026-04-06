import { AdminChrome } from "@/components/admin/AdminChrome";
import { CreateCarrierPageClient } from "@/components/admin/CreateCarrierPageClient";

export default function CreateCarrierPage() {
  return (
    <AdminChrome title="Create New Carrier">
      <CreateCarrierPageClient />
    </AdminChrome>
  );
}
