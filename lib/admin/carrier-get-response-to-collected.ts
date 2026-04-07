/**
 * Map GET /carriers/{code} JSON into flat collected params used by update section forms.
 * Safe on client and server (no server-only).
 */

import type {
  CarrierGetResponse,
  UpdateCarrierBaseRegulatory,
  UpdateCarrierBaseUrls,
} from "@/types/zinnia/carriers";
import { ME_SNAPSHOT_KEY } from "@/lib/workflows/update-multi-entry-keys";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function firstRow<T extends Record<string, unknown>>(
  v: T | T[] | undefined | null,
): T | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v[0] as T | undefined;
  return v as T;
}

function cloneObjectArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  return v
    .filter((x) => isPlainObject(x))
    .map((x) => ({ ...(x as Record<string, unknown>) }));
}

function ynToForm(v: unknown): string {
  if (v === "Y" || v === "N") return v;
  if (typeof v === "boolean") return v ? "Y" : "N";
  return "";
}

function numStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  return String(v).trim();
}

function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function arrJoin(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join(", ");
  return str(v);
}

/** Normalize `base.urls` when API returns a single object instead of an array. */
function urlsFirst(
  urls: unknown,
): UpdateCarrierBaseUrls | undefined {
  if (urls === undefined || urls === null) return undefined;
  if (Array.isArray(urls)) return urls[0] as UpdateCarrierBaseUrls | undefined;
  if (isPlainObject(urls)) return urls as UpdateCarrierBaseUrls;
  return undefined;
}

/**
 * Flatten carrier GET response for `stringValuesForUpdateSection` / PUT merge pipeline.
 */
export function carrierGetResponseToCollectedParams(
  carrier: CarrierGetResponse,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const code = str(carrier.carrierCode).toUpperCase();
  if (code) out.carrierCode = code;

  const base = carrier.base;
  const urlRow = urlsFirst(base?.urls);
  const regRow = firstRow(base?.regulatory) as UpdateCarrierBaseRegulatory | undefined;
  const hrsRow = firstRow(base?.hoursOfOperation);

  const carrierId = str(carrier.id ?? base?.carrierId);
  if (carrierId) out.basic_carrierId = carrierId;

  const sec = str(base?.secondaryCarrierCode);
  if (sec) out.basic_secondaryCarrierCode = sec;

  const entity = str(base?.entityType ?? carrier.entityType);
  if (entity) out.basic_entityType = entity;

  const cname = str(base?.carrierName ?? carrier.carrierName);
  if (cname) out.basic_carrierName = cname;

  const lob = str(base?.lineOfBusiness ?? carrier.lineOfBusiness);
  if (lob) out.basic_lineOfBusiness = lob;

  const pt = carrier.productTypes ?? base?.productTypes;
  if (Array.isArray(pt) && pt.length) {
    out.basic_productTypes = pt.map((x) => String(x).trim()).filter(Boolean);
  }

  const up = str(base?.ultimateParentCompanyId ?? carrier.ultimateParentCompanyId);
  if (up) out.org_ultimateParentCompanyId = up;

  const pp = str(base?.parentCompanyId ?? carrier.parentCompanyId);
  if (pp) out.org_parentCompanyId = pp;

  const on = str(base?.organizationName ?? carrier.organizationName);
  if (on) out.org_organizationName = on;

  const dba = str(base?.organizationDba ?? carrier.organizationDba);
  if (dba) out.org_organizationDba = dba;

  const osn = str(base?.organizationShortName);
  if (osn) out.org_organizationShortName = osn;

  const logo = str(base?.logoAssetReference);
  if (logo) out.org_logoAssetReference = logo;

  if (urlRow && isPlainObject(urlRow)) {
    const u = urlRow as Record<string, unknown>;
    const m: [string, string][] = [
      ["url_organizationDomainName", "organizationDomainName"],
      ["url_carrierLoginUrl", "carrierLoginUrl"],
      ["url_agentLoginUrl", "agentLoginUrl"],
      ["url_customerLoginUrl", "customerLoginUrl"],
    ];
    for (const [flat, src] of m) {
      const s = str(u[src]);
      if (s) out[flat] = s;
    }
  }

  if (regRow && isPlainObject(regRow)) {
    const r = regRow as Record<string, unknown>;
    const fy = numStr(r.foundedYear);
    if (fy) out.reg_foundedYear = fy;
    const rlob = str(r.lineOfBusiness);
    if (rlob) out.reg_lineOfBusiness = rlob;
    const states = r.authorizedJurisdictionStates;
    const sj = arrJoin(states);
    if (sj) out.reg_authorizedJurisdictionStates = sj;
    const rating = str(r.rating);
    if (rating) out.reg_rating = rating;
    const tpa = str(r.tpaNonTpa);
    if (tpa) out.reg_tpaNonTpa = tpa;
    const y1 = ynToForm(r.isC2CRplParticipant);
    if (y1) out.reg_isC2CRplParticipant = y1;
    const y2 = ynToForm(r.use1035YP);
    if (y2) out.reg_use1035YP = y2;
  }

  if (hrsRow && isPlainObject(hrsRow)) {
    const h = hrsRow as Record<string, unknown>;
    const pairs: [string, string][] = [
      ["hrs_businessHourStart", "businessHourStart"],
      ["hrs_businessHourEnd", "businessHourEnd"],
      ["hrs_businessDays", "businessDays"],
      ["hrs_businessHoursTimeZone", "businessHoursTimeZone"],
    ];
    for (const [flat, src] of pairs) {
      const s = str(h[src]);
      if (s) out[flat] = s;
    }
  }

  const conn = carrier.connectors;
  const dtcc = firstRow(conn?.dtccIds);
  if (dtcc && isPlainObject(dtcc)) {
    const d = dtcc as Record<string, unknown>;
    const p = str(d.participantId);
    const l = str(d.locationId);
    if (p) out.conn_dtcc_participantId = p;
    if (l) out.conn_dtcc_locationId = l;
  }
  const c2c = firstRow(conn?.c2cConnectedCarriers);
  if (c2c && isPlainObject(c2c)) {
    const d = c2c as Record<string, unknown>;
    const p = str(d.participantId);
    const l = str(d.locationId);
    if (p) out.conn_c2c_participantId = p;
    if (l) out.conn_c2c_locationId = l;
  }

  out[ME_SNAPSHOT_KEY.addresses] = cloneObjectArray(carrier.addresses);
  out[ME_SNAPSHOT_KEY.phones] = cloneObjectArray(carrier.phones);
  out[ME_SNAPSHOT_KEY.emails] = cloneObjectArray(carrier.emails);
  out[ME_SNAPSHOT_KEY.identifiers] = cloneObjectArray(base?.identifiers);
  out[ME_SNAPSHOT_KEY.business_holidays] = cloneObjectArray(
    base?.businessHolidays,
  );

  return out;
}
