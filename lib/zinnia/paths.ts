/**
 * Carrier platform routes relative to `ZINNIA_BASE_URL`
 * (e.g. `https://dev.api.zinnia.io/dep-platform-admin-console/v1`).
 *
 * | Method | Path |
 * |--------|------|
 * | POST | /carriers/draft |
 * | GET | /carriers/{carrierCode} |
 * | PUT | /carriers/{carrierCode} |
 * | DELETE | /carriers/{carrierCode} |
 * | GET | /carriers |
 * | GET | /datapoints |
 */
export const ZinniaApiPaths = {
  carriersDraft: "/carriers/draft",
  carriers: "/carriers",
  datapoints: "/datapoints",
} as const;

export function zinniaCarrierPath(carrierCode: string): string {
  return `/carriers/${encodeURIComponent(carrierCode)}`;
}
