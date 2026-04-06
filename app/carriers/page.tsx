import { AdminChrome } from "@/components/admin/AdminChrome";
import { CarrierListClient } from "@/components/admin/CarrierListClient";

export default function CarriersListPage() {
  return (
    <AdminChrome title="List All Carriers">
      <CarrierListClient />
    </AdminChrome>
  );
}
