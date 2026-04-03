/**
 * Nested payload mapping: turn flat collected params into API-shaped objects.
 * Use inside `buildPayload` for backends that expect nested JSON.
 */

function setDeep(
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  if (path.length === 0) return;
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i]!;
    const next = cur[p];
    if (next !== undefined && typeof next === "object" && !Array.isArray(next)) {
      cur = next as Record<string, unknown>;
    } else {
      const nested: Record<string, unknown> = {};
      cur[p] = nested;
      cur = nested;
    }
  }
  const leaf = path[path.length - 1]!;
  cur[leaf] = value;
}

/**
 * Maps flat keys to nested paths (dot notation). Only keys present in `flat` are applied.
 *
 * @param flat - Collected workflow data (flat keys)
 * @param flatKeyToDotPath - e.g. `{ organizationLegalName: "organization.legalName" }`
 */
export function mapFlatToNestedPaths(
  flat: Record<string, unknown>,
  flatKeyToDotPath: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [flatKey, dotPath] of Object.entries(flatKeyToDotPath)) {
    if (!(flatKey in flat)) continue;
    const value = flat[flatKey];
    if (value === undefined) continue;
    const segments = dotPath.split(".").filter(Boolean);
    if (segments.length === 0) continue;
    setDeep(out, segments, value);
  }
  return out;
}

/**
 * Same as `mapFlatToNestedPaths`, then copies any flat keys not listed in the map
 * onto the root of the result (typical for IDs that stay top-level).
 */
export function mapFlatToNestedWithRemainder(
  flat: Record<string, unknown>,
  flatKeyToDotPath: Record<string, string>,
): Record<string, unknown> {
  const nested = mapFlatToNestedPaths(flat, flatKeyToDotPath);
  const mapped = new Set(Object.keys(flatKeyToDotPath));
  const out: Record<string, unknown> = { ...nested };
  for (const [k, v] of Object.entries(flat)) {
    if (mapped.has(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}
