/**
 * Zinnia GET /datapoints — catalog entries for forms and validation.
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

/** Wrapped or array root responses from the API. */
export type DatapointApiResponse =
  | DatapointItem[]
  | {
      items?: DatapointItem[];
      datapoints?: DatapointItem[];
      data?: DatapointItem[];
      totalCount?: number;
    };

/** Normalized shape consumers should prefer. */
export type DatapointResponse = {
  items: DatapointItem[];
  totalCount?: number;
};

export function normalizeDatapointResponse(
  raw: DatapointApiResponse,
): DatapointResponse {
  if (Array.isArray(raw)) {
    return { items: raw };
  }
  const items =
    raw.items ?? raw.datapoints ?? raw.data ?? [];
  return {
    items,
    totalCount: raw.totalCount,
  };
}
