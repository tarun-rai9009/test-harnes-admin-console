/**
 * Zinnia GET /datapoints — reference maps and/or legacy list catalog.
 */

export type DatapointItem = {
  id?: string;
  code?: string;
  name?: string;
  label?: string;
  category?: string;
  dataType?: string;
  description?: string;
  /** Allow extra fields from the backend without losing typing */
  [key: string]: unknown;
};

/** OpenAPI: datapoint enum name → allowed value → display label. */
export type DatapointReferenceMap = Record<string, Record<string, string>>;

/** Wrapped or array root responses from the API. */
export type DatapointApiResponse =
  | DatapointItem[]
  | DatapointReferenceMap
  | {
      items?: DatapointItem[];
      datapoints?: DatapointItem[];
      data?: DatapointItem[];
      totalCount?: number;
      /** Some gateways wrap the reference map */
      referenceByKey?: DatapointReferenceMap;
      referenceData?: DatapointReferenceMap;
    };

/** Normalized shape consumers should prefer. */
export type DatapointResponse = {
  items: DatapointItem[];
  totalCount?: number;
  /** Value→label maps keyed by datapoint id (e.g. ENTITY_TYPE). */
  referenceByKey: DatapointReferenceMap;
};

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * True when root is a map of string → Record<string, string> (OpenAPI /datapoints shape).
 */
export function isDatapointReferenceMapRoot(
  raw: unknown,
): raw is DatapointReferenceMap {
  if (!isPlainRecord(raw)) return false;
  const keys = Object.keys(raw);
  if (keys.length === 0) return false;
  for (const k of keys) {
    const v = raw[k];
    if (!isPlainRecord(v)) return false;
    for (const inner of Object.values(v)) {
      if (typeof inner !== "string") return false;
    }
  }
  return true;
}

export function normalizeDatapointResponse(
  raw: DatapointApiResponse,
): DatapointResponse {
  const empty: DatapointResponse = {
    items: [],
    referenceByKey: {},
  };

  if (Array.isArray(raw)) {
    return { items: raw, referenceByKey: {} };
  }

  if (!isPlainRecord(raw)) {
    return empty;
  }

  const refNested =
    raw.referenceByKey ?? raw.referenceData;
  if (isPlainRecord(refNested) && isDatapointReferenceMapRoot(refNested)) {
    const items =
      raw.items ?? raw.datapoints ?? raw.data ?? [];
    const totalCount =
      typeof raw.totalCount === "number" ? raw.totalCount : undefined;
    return {
      items: Array.isArray(items) ? items : [],
      totalCount,
      referenceByKey: refNested,
    };
  }

  if (isDatapointReferenceMapRoot(raw)) {
    return { items: [], referenceByKey: raw };
  }

  const items =
    raw.items ?? raw.datapoints ?? raw.data ?? [];
  const totalCount =
    typeof raw.totalCount === "number" ? raw.totalCount : undefined;
  return {
    items: Array.isArray(items) ? items : [],
    totalCount,
    referenceByKey: {},
  };
}
