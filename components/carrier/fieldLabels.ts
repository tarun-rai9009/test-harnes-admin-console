/** Business-friendly labels for workflow field keys (never show raw keys alone). */
export const FIELD_LABELS: Record<string, string> = {
  carrierCode: "Carrier code",
  carrierName: "Carrier name",
  entityType: "Entity type",
  organizationName: "Organization name",
  organizationDba: "DBA name",
  lineOfBusiness: "Line of business",
  productTypes: "Product types",
  ultimateParentCompanyId: "Ultimate parent company ID",
  parentCompanyId: "Parent company ID",
};

export function labelForFieldKey(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}
