/**
 * Map Zinnia API error JSON to field keys when keys are in an allowed set.
 * Shared by create-draft and update-carrier form flows.
 */

function leafKey(path: string): string {
  const s = path
    .replace(/^\$\.?/, "")
    .replace(/\[\d+\]/g, "")
    .split(".")
    .pop()!
    .replace(/[[\]"']/g, "")
    .trim();
  return s || path.trim();
}

function firstStringMessage(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    for (const x of v) {
      const m = firstStringMessage(x);
      if (m) return m;
    }
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["message", "detail", "description", "msg", "error"]) {
      const m = firstStringMessage(o[k]);
      if (m) return m;
    }
  }
  return undefined;
}

export function parseZinniaErrorBodyForAllowedKeys(
  bodyText: string,
  allowed: Set<string>,
): { fieldErrors: Record<string, string>; formLevelMessage?: string } {
  const fieldErrors: Record<string, string> = {};
  const trimmed = bodyText.trim();

  const tryParse = (): unknown => {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  };

  const root = tryParse();
  const visited = new WeakSet<object>();

  const assignField = (key: string, message: string) => {
    const k = leafKey(key);
    if (!allowed.has(k)) return;
    if (!fieldErrors[k]) fieldErrors[k] = message;
  };

  const walk = (node: unknown, depth: number): void => {
    if (depth > 12 || node === null || node === undefined) return;
    if (typeof node === "string") return;

    if (typeof node === "object") {
      if (visited.has(node as object)) return;
      visited.add(node as object);
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const fk =
            typeof o.field === "string"
              ? o.field
              : typeof o.property === "string"
                ? o.property
                : typeof o.path === "string"
                  ? leafKey(o.path)
                  : undefined;
          const msg =
            firstStringMessage(o.message) ??
            firstStringMessage(o.detail) ??
            firstStringMessage(o.defaultMessage);
          if (fk && msg) assignField(fk, msg);
        }
        walk(item, depth + 1);
      }
      return;
    }

    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    for (const [k, v] of Object.entries(obj)) {
      if (k === "field" && typeof v === "string") {
        const msg =
          firstStringMessage(obj.message) ??
          firstStringMessage(obj.detail) ??
          firstStringMessage(obj.title);
        if (msg) assignField(v, msg);
      }
    }

    const nestedErrorObjects = [
      "errors",
      "validationErrors",
      "fieldErrors",
      "fields",
      "violations",
      "details",
    ] as const;

    for (const nk of nestedErrorObjects) {
      const inner = obj[nk];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        for (const [fk, fv] of Object.entries(inner as Record<string, unknown>)) {
          const msg = firstStringMessage(fv);
          if (msg) assignField(fk, msg);
        }
      }
    }

    if (Array.isArray(obj.errors)) walk(obj.errors, depth + 1);
    if (Array.isArray(obj.violations)) walk(obj.violations, depth + 1);

    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") walk(v, depth + 1);
    }
  };

  if (root !== null) walk(root, 0);

  let formLevelMessage: string | undefined;

  if (Object.keys(fieldErrors).length === 0 && root && typeof root === "object") {
    const o = root as Record<string, unknown>;
    formLevelMessage =
      firstStringMessage(o.detail) ??
      firstStringMessage(o.message) ??
      firstStringMessage(o.error) ??
      firstStringMessage(o.title);
  }

  if (!formLevelMessage && Object.keys(fieldErrors).length === 0 && trimmed) {
    if (!root) {
      formLevelMessage =
        trimmed.length > 500 ? `${trimmed.slice(0, 497)}…` : trimmed;
    } else {
      formLevelMessage =
        firstStringMessage((root as Record<string, unknown>).detail) ??
        firstStringMessage((root as Record<string, unknown>).message);
    }
  }

  return { fieldErrors, formLevelMessage };
}
