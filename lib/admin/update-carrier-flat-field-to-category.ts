import {
  type UpdateCategoryId,
  UPDATE_CATEGORY_FIELD_KEYS,
  UPDATE_CATEGORY_ORDER,
} from "@/lib/workflows/definitions/update-carrier-constants";
import {
  isMultiEntryCategory,
  type MultiEntryCategoryId,
} from "@/lib/workflows/update-multi-entry-keys";

let keyToCategoryCache: Record<string, UpdateCategoryId> | null = null;

export function getFlatUpdateFieldKeyToCategory(): Record<
  string,
  UpdateCategoryId
> {
  if (keyToCategoryCache) return keyToCategoryCache;
  const m: Record<string, UpdateCategoryId> = {};
  for (const cat of UPDATE_CATEGORY_ORDER) {
    for (const k of UPDATE_CATEGORY_FIELD_KEYS[cat]) {
      m[k] = cat;
    }
  }
  keyToCategoryCache = m;
  return m;
}

/** Split API `fieldErrors` (flat collected keys) by update section. */
export function distributeFieldErrorsByUpdateCategory(
  fieldErrors: Record<string, string>,
): Partial<Record<UpdateCategoryId, Record<string, string>>> {
  const map = getFlatUpdateFieldKeyToCategory();
  const out: Partial<Record<UpdateCategoryId, Record<string, string>>> = {};
  for (const [k, v] of Object.entries(fieldErrors)) {
    const cat = map[k];
    if (!cat) continue;
    if (!out[cat]) out[cat] = {};
    out[cat]![k] = v;
  }
  return out;
}

/**
 * Row-level API errors usually refer to one multi-entry PUT. When multiple ME
 * sections were sent, prefer the first listed in the applied set.
 */
export function primaryMultiEntryCategoryForRowErrors(
  applied: UpdateCategoryId[],
): MultiEntryCategoryId | undefined {
  const me = applied.filter(isMultiEntryCategory);
  return me[0];
}
