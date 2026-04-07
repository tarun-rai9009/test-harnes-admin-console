import { AdminChrome } from "@/components/admin/AdminChrome";

export default function ProductMasterPage() {
  return (
    <AdminChrome activeService="product-master" title="Product Master">
      <div className="ui-panel max-w-2xl">
        <p className="ui-panel-title">Coming soon</p>
        <p className="ui-panel-desc">
          Product master tools will be added here. This area is reserved for
          future catalog and product workflows.
        </p>
      </div>
    </AdminChrome>
  );
}
