import { getOpenApiUpdateSectionRequirementErrors } from "@/lib/workflows/update-carrier-openapi-requirements";
import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
} from "@/lib/workflows/definitions/update-carrier-constants";
import { getUpdateCarrierNoChangesMessage } from "@/lib/workflows/definitions/update-carrier-catalog";
import {
  getFieldDefsForUpdateCategory,
} from "@/lib/workflows/update-carrier-section-form";
import {
  isMultiEntryCategory,
  ME_MATCH_API_KEY,
  ME_MATCH_FLAT_KEY,
  ME_PENDING_ROWS_KEY,
  ME_PUT_KEY,
  ME_SNAPSHOT_KEY,
  type MultiEntryCategoryId,
} from "@/lib/workflows/update-multi-entry-keys";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strVal(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function pickDefinedRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

/** Flat form row → API object for one entry (same shapes as collectedParamsToUpdatePayload). */
export function flatRowToApiObject(
  categoryId: MultiEntryCategoryId,
  flat: Record<string, string>,
): Record<string, unknown> {
  const t = (k: string) => {
    const v = flat[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  switch (categoryId) {
    case "addresses":
      return pickDefinedRow({
        addressType: t("addr_addressType"),
        addressLine1: t("addr_addressLine1"),
        addressLine2: t("addr_addressLine2"),
        addressLine3: t("addr_addressLine3"),
        city: t("addr_city"),
        state: t("addr_state"),
        addressZipCode: t("addr_addressZipCode"),
        addressZipCodeExt: t("addr_addressZipCodeExt"),
        addressCountry: t("addr_addressCountry"),
        addressEffectiveDate: t("addr_addressEffectiveDate"),
        addressEndDate: t("addr_addressEndDate"),
      });
    case "phones":
      return pickDefinedRow({
        phoneType: t("phone_phoneType"),
        countryCode: t("phone_countryCode"),
        areaCode: t("phone_areaCode"),
        dialNumber: t("phone_dialNumber"),
        extension: t("phone_extension"),
        phoneEffectiveDate: t("phone_phoneEffectiveDate"),
        phoneEndDate: t("phone_phoneEndDate"),
      });
    case "emails":
      return pickDefinedRow({
        emailType: t("em_emailType"),
        emailAddress: t("em_emailAddress"),
        emailEffectiveDate: t("em_emailEffectiveDate"),
        emailEndDate: t("em_emailEndDate"),
      });
    case "identifiers":
      return pickDefinedRow({
        identifierType: t("id_identifierType"),
        identifierValue: t("id_identifierValue"),
      });
    default:
      return {};
  }
}

export function snapshotRowToFlatStrings(
  categoryId: MultiEntryCategoryId,
  row: Record<string, unknown>,
): Record<string, string> {
  const keys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = "";
  const r = row;
  switch (categoryId) {
    case "addresses":
      out.addr_addressType = strVal(r.addressType);
      out.addr_addressLine1 = strVal(r.addressLine1);
      out.addr_addressLine2 = strVal(r.addressLine2);
      out.addr_addressLine3 = strVal(r.addressLine3);
      out.addr_city = strVal(r.city);
      out.addr_state = strVal(r.state);
      out.addr_addressZipCode = strVal(r.addressZipCode);
      out.addr_addressZipCodeExt = strVal(r.addressZipCodeExt);
      out.addr_addressCountry = strVal(r.addressCountry);
      out.addr_addressEffectiveDate = strVal(r.addressEffectiveDate);
      out.addr_addressEndDate = strVal(r.addressEndDate);
      break;
    case "phones":
      out.phone_phoneType = strVal(r.phoneType);
      out.phone_countryCode = strVal(r.countryCode);
      out.phone_areaCode = strVal(r.areaCode);
      out.phone_dialNumber = strVal(r.dialNumber);
      out.phone_extension = strVal(r.extension);
      out.phone_phoneEffectiveDate = strVal(r.phoneEffectiveDate);
      out.phone_phoneEndDate = strVal(r.phoneEndDate);
      break;
    case "emails":
      out.em_emailType = strVal(r.emailType);
      out.em_emailAddress = strVal(r.emailAddress);
      out.em_emailEffectiveDate = strVal(r.emailEffectiveDate);
      out.em_emailEndDate = strVal(r.emailEndDate);
      break;
    case "identifiers":
      out.id_identifierType = strVal(r.identifierType);
      out.id_identifierValue = strVal(r.identifierValue);
      break;
    default:
      break;
  }
  return out;
}

export function getMultiEntrySnapshot(
  collected: Record<string, unknown>,
  categoryId: MultiEntryCategoryId,
): Record<string, unknown>[] {
  const raw = collected[ME_SNAPSHOT_KEY[categoryId]];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPlainObject).map((x) => ({ ...(x as Record<string, unknown>) }));
}

export function emptyFlatRow(
  categoryId: MultiEntryCategoryId,
): Record<string, string> {
  const keys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = "";
  return out;
}

/** Initial rows for the multi-entry form: one card per snapshot row, or one blank row. */
export function initialRowsFromSnapshot(
  collected: Record<string, unknown>,
  categoryId: MultiEntryCategoryId,
): Record<string, string>[] {
  const snap = getMultiEntrySnapshot(collected, categoryId);
  if (snap.length === 0) return [emptyFlatRow(categoryId)];
  return snap.map((row) => snapshotRowToFlatStrings(categoryId, row));
}

/** Prefer stashed rows from a pending confirm / error recovery, else snapshot. */
export function getInitialMultiEntryRows(
  collected: Record<string, unknown>,
  categoryId: MultiEntryCategoryId,
): Record<string, string>[] {
  const pending = collected[ME_PENDING_ROWS_KEY];
  const keys = UPDATE_CATEGORY_FIELD_KEYS[categoryId];
  if (Array.isArray(pending) && pending.length > 0) {
    const out: Record<string, string>[] = [];
    for (const item of pending) {
      if (!isPlainObject(item)) continue;
      const rec = item as Record<string, unknown>;
      const row = emptyFlatRow(categoryId);
      for (const k of keys) {
        const v = rec[k];
        row[k] = typeof v === "string" ? v : v != null ? String(v) : "";
      }
      out.push(row);
    }
    if (out.length) return out;
  }
  return initialRowsFromSnapshot(collected, categoryId);
}

function rowHasAnyValue(
  categoryId: MultiEntryCategoryId,
  flat: Record<string, string>,
): boolean {
  for (const k of UPDATE_CATEGORY_FIELD_KEYS[categoryId]) {
    if ((flat[k] ?? "").trim()) return true;
  }
  return false;
}

export const MULTI_ENTRY_TYPE_REQUIRED_MESSAGE =
  "Type is required to match or create an entry.";

export const MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE =
  "Entry with this type already exists.";

/** Later rows with the same trimmed type as an earlier row get an error on the match-flat key. */
export function duplicateMultiEntryTypeRowErrors(
  rows: Record<string, string>[],
  categoryId: MultiEntryCategoryId,
): Record<number, Record<string, string>> {
  const mk = ME_MATCH_FLAT_KEY[categoryId];
  const seen = new Map<string, number>();
  const out: Record<number, Record<string, string>> = {};
  for (let i = 0; i < rows.length; i++) {
    const t = (rows[i]![mk] ?? "").trim();
    if (!t) continue;
    if (!seen.has(t)) {
      seen.set(t, i);
      continue;
    }
    out[i] = { [mk]: MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE };
  }
  return out;
}

/** New rows (index >= snapshotLength) with data but no type — block adding another entry until fixed. */
export function incompleteNewMultiEntryTypeErrors(
  rows: Record<string, string>[],
  categoryId: MultiEntryCategoryId,
  snapshotLength: number,
): Record<number, Record<string, string>> {
  const mk = ME_MATCH_FLAT_KEY[categoryId];
  const out: Record<number, Record<string, string>> = {};
  for (let i = snapshotLength; i < rows.length; i++) {
    const flat = rows[i]!;
    if (!rowHasAnyValue(categoryId, flat)) continue;
    if ((flat[mk] ?? "").trim()) continue;
    out[i] = { [mk]: MULTI_ENTRY_TYPE_REQUIRED_MESSAGE };
  }
  return out;
}

function mergeIntoRowErrors(
  target: Record<number, Record<string, string>>,
  source: Record<number, Record<string, string>>,
): void {
  for (const iStr of Object.keys(source)) {
    const i = Number(iStr);
    const add = source[i];
    if (!add) continue;
    target[i] = { ...(target[i] ?? {}), ...add };
  }
}

function cloneSnapshotForMerge(
  arr: Record<string, unknown>[],
): Record<string, unknown>[] {
  return arr.map((o) => ({ ...o }));
}

/**
 * Merge UI rows into snapshot: match on type field; shallow-merge or append.
 */
export function mergeMultiEntryArrays(
  snapshot: Record<string, unknown>[],
  rows: Record<string, string>[],
  categoryId: MultiEntryCategoryId,
): Record<string, unknown>[] {
  const matchKey = ME_MATCH_API_KEY[categoryId];
  const out = cloneSnapshotForMerge(snapshot);
  for (const flat of rows) {
    if (!rowHasAnyValue(categoryId, flat)) continue;
    const obj = flatRowToApiObject(categoryId, flat);
    if (Object.keys(obj).length === 0) continue;
    const keyVal = strVal(obj[matchKey]);
    if (keyVal) {
      const idx = out.findIndex(
        (ex) => strVal(ex[matchKey]) === keyVal,
      );
      if (idx >= 0) {
        out[idx] = { ...out[idx], ...obj };
        continue;
      }
    }
    out.push(obj);
  }
  return out;
}

function stableSerializeArray(arr: Record<string, unknown>[]): string {
  const norm = (o: Record<string, unknown>) => {
    const keys = Object.keys(o).sort();
    const sorted: Record<string, unknown> = {};
    for (const k of keys) sorted[k] = o[k];
    return sorted;
  };
  return JSON.stringify(arr.map(norm));
}

export function arraysEqualForMultiEntry(
  a: Record<string, unknown>[],
  b: Record<string, unknown>[],
): boolean {
  return stableSerializeArray(a) === stableSerializeArray(b);
}

export type MultiEntryValidateResult =
  | { ok: true; merged: Record<string, unknown> }
  | {
      ok: false;
      rowErrors: Record<number, Record<string, string>>;
      formLevelError?: string;
    };

/**
 * Validate each row, merge into PUT array, merge into collected for confirm/PUT.
 */
export function validateAndMergeMultiEntrySection(
  baseCollected: Record<string, unknown>,
  categoryId: UpdateCategoryId,
  rows: Record<string, string>[],
): MultiEntryValidateResult {
  if (!isMultiEntryCategory(categoryId)) {
    return {
      ok: false,
      rowErrors: {},
      formLevelError: "Invalid category for multi-entry update.",
    };
  }

  const snapshot = getMultiEntrySnapshot(baseCollected, categoryId);
  const defs = getFieldDefsForUpdateCategory(categoryId);
  const rowErrors: Record<number, Record<string, string>> = {};

  for (let i = 0; i < rows.length; i++) {
    const flat = rows[i]!;
    if (!rowHasAnyValue(categoryId, flat)) continue;

    const errs: Record<string, string> = {};
    const mkFlat = ME_MATCH_FLAT_KEY[categoryId];
    if (!(flat[mkFlat] ?? "").trim()) {
      errs[mkFlat] = MULTI_ENTRY_TYPE_REQUIRED_MESSAGE;
    }

    for (const def of defs) {
      const raw = flat[def.key] ?? "";
      const res = def.validate(raw);
      if (!res.ok) errs[def.key] = res.error;
    }
    const openApi = getOpenApiUpdateSectionRequirementErrors(categoryId, flat);
    Object.assign(errs, openApi);

    if (Object.keys(errs).length) rowErrors[i] = errs;
  }

  mergeIntoRowErrors(
    rowErrors,
    duplicateMultiEntryTypeRowErrors(rows, categoryId),
  );

  if (Object.keys(rowErrors).length > 0) {
    return { ok: false, rowErrors };
  }

  const mergedArray = mergeMultiEntryArrays(snapshot, rows, categoryId);

  if (arraysEqualForMultiEntry(mergedArray, snapshot)) {
    return {
      ok: false,
      rowErrors: {},
      formLevelError: getUpdateCarrierNoChangesMessage(),
    };
  }

  const merged: Record<string, unknown> = { ...baseCollected };
  merged.updateCategory = categoryId;

  for (const k of UPDATE_CATEGORY_FIELD_KEYS[categoryId]) {
    delete merged[k];
  }

  delete merged[ME_PUT_KEY[categoryId]];
  merged[ME_PUT_KEY[categoryId]] = mergedArray;
  merged[ME_SNAPSHOT_KEY[categoryId]] = snapshot;
  merged[ME_PENDING_ROWS_KEY] = rows;

  return { ok: true, merged };
}
