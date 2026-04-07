import { AdminChrome } from "@/components/admin/AdminChrome";
import { CarrierListClient } from "@/components/admin/CarrierListClient";

export default function CarriersListPage() {
  return (
    <AdminChrome
      activeService="carrier-master"
      title="List All Carriers"
    >
      <CarrierListClient />
    </AdminChrome>
  );
}
