import type { UpdateCategoryId } from "@/lib/workflows/definitions/update-carrier-constants";

export const MULTI_ENTRY_CATEGORIES = [
  "addresses",
  "phones",
  "emails",
  "identifiers",
] as const;

export type MultiEntryCategoryId = (typeof MULTI_ENTRY_CATEGORIES)[number];

export function isMultiEntryCategory(
  id: UpdateCategoryId,
): id is MultiEntryCategoryId {
  return (MULTI_ENTRY_CATEGORIES as readonly string[]).includes(id);
}

/** Collected keys: cloned arrays from GET for merge baseline. */
export const ME_SNAPSHOT_KEY: Record<MultiEntryCategoryId, string> = {
  addresses: "_me_snapshot_addresses",
  phones: "_me_snapshot_phones",
  emails: "_me_snapshot_emails",
  identifiers: "_me_snapshot_identifiers",
};

/** Collected keys: full merged arrays sent in PUT (built on submit). */
export const ME_PUT_KEY: Record<MultiEntryCategoryId, string> = {
  addresses: "_me_put_addresses",
  phones: "_me_put_phones",
  emails: "_me_put_emails",
  identifiers: "_me_put_identifiers",
};

/** API field used to match existing row for upsert (first match wins). */
export const ME_MATCH_API_KEY: Record<MultiEntryCategoryId, string> = {
  addresses: "addressType",
  phones: "phoneType",
  emails: "emailType",
  identifiers: "identifierType",
};

/** Collected flat key for the match field (required when row has any other value). */
export const ME_MATCH_FLAT_KEY: Record<MultiEntryCategoryId, string> = {
  addresses: "addr_addressType",
  phones: "phone_phoneType",
  emails: "em_emailType",
  identifiers: "id_identifierType",
};

/** Stash edited flat rows for re-showing the form after a failed PUT. */
export const ME_PENDING_ROWS_KEY = "_me_pending_rows";
