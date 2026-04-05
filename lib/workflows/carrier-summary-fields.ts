import type { CarrierDetails, CarrierSummary } from "@/types/zinnia/carriers";

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v);
}

/** Short summary for carrier lookup — full record is shown in the structured panel. */
export function carrierLookupBriefSummaryFields(
  d: CarrierDetails,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "Carrier code", value: fmt(d.carrierCode) },
    { label: "Carrier name", value: fmt(d.carrierName) },
  ];
  const status = (d as Record<string, unknown>).status;
  if (status !== undefined && status !== null && String(status).trim() !== "") {
    rows.push({ label: "Status", value: String(status) });
  }
  return rows;
}

/** Detail card rows for a single carrier (business labels, title case). */
export function carrierDetailsToSummaryFields(
  d: CarrierDetails,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "Carrier Code", value: fmt(d.carrierCode) },
    { label: "Carrier Name", value: fmt(d.carrierName) },
    { label: "Entity Type", value: fmt(d.entityType) },
    { label: "Organization Name", value: fmt(d.organizationName) },
    { label: "DBA", value: fmt(d.organizationDba) },
    { label: "Line of Business", value: fmt(d.lineOfBusiness) },
    { label: "Product Types", value: fmt(d.productTypes) },
    {
      label: "Ultimate Parent Company ID",
      value: fmt(d.ultimateParentCompanyId),
    },
    { label: "Parent Company ID", value: fmt(d.parentCompanyId) },
  ];
  const status = (d as Record<string, unknown>).status;
  if (status !== undefined && status !== null && String(status).trim() !== "") {
    rows.push({ label: "Status", value: String(status) });
  }
  return rows;
}

export type SummaryTable = {
  columns: { id: string; label: string }[];
  rows: Record<string, string>[];
};

/** Readable table for “all carriers” (no raw JSON in the UI). */
export function carrierListToSummaryTable(list: CarrierSummary[]): SummaryTable {
  const columns = [
    { id: "carrierCode", label: "Carrier Code" },
    { id: "carrierName", label: "Carrier Name" },
    { id: "status", label: "Status" },
  ];
  const rows = list.map((c) => ({
    carrierCode: fmt(c.carrierCode),
    carrierName: fmt(c.carrierName),
    status: fmt(c.status),
  }));
  return { columns, rows };
}
