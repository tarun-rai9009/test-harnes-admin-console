import type { CarrierGetResponse } from "@/types/zinnia/carriers";

export const UPDATE_CARRIER_SESSION_BOOTSTRAP_KEY =
  "harness-admin-update-carrier-bootstrap-v1";

export type UpdateCarrierSessionBootstrapV1 = {
  v: 1;
  code: string;
  carrier: CarrierGetResponse;
};

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function writeUpdateCarrierSessionBootstrap(
  carrier: CarrierGetResponse,
): void {
  if (typeof window === "undefined") return;
  const code = normalizeCode(String(carrier.carrierCode ?? ""));
  if (!/^[A-Z0-9]{4}$/.test(code)) return;
  const payload: UpdateCarrierSessionBootstrapV1 = { v: 1, code, carrier };
  try {
    sessionStorage.setItem(
      UPDATE_CARRIER_SESSION_BOOTSTRAP_KEY,
      JSON.stringify(payload),
    );
  } catch {
    /* quota or private mode */
  }
}

/**
 * If a bootstrap exists for the expected carrier code, removes it from storage
 * and returns the carrier payload; otherwise returns null.
 */
export function takeUpdateCarrierSessionBootstrap(
  expectedCode: string,
): CarrierGetResponse | null {
  if (typeof window === "undefined") return null;
  const want = normalizeCode(expectedCode);
  if (!/^[A-Z0-9]{4}$/.test(want)) return null;
  try {
    const raw = sessionStorage.getItem(UPDATE_CARRIER_SESSION_BOOTSTRAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (o.v !== 1 || typeof o.code !== "string" || !o.carrier) return null;
    if (normalizeCode(o.code) !== want) return null;
    sessionStorage.removeItem(UPDATE_CARRIER_SESSION_BOOTSTRAP_KEY);
    return o.carrier as CarrierGetResponse;
  } catch {
    return null;
  }
}
