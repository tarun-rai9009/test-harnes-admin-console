import { CARRIER_FORM_FIELD_ENUM } from "@/lib/workflows/carrier-form-enum-bindings";
import { optionsForOpenApiEnumSchema } from "@/lib/workflows/carrier-form-enum-ui";
import type { EnumSelectOption } from "@/lib/workflows/carrier-form-enum-ui";
import type { DatapointReferenceMap } from "@/types/zinnia/datapoints";
import type { OpenApiEnumSchemaName } from "@/types/zinnia/generated/openapi-enums";
import { datapointKeyForOpenApiSchema } from "@/lib/datapoints/openapi-schema-to-datapoint-key";
import { referenceMapToOptions } from "@/lib/datapoints/reference-map-to-options";

/**
 * Per field key: select options from datapoint reference map, or OpenAPI enum fallback.
 */
export function buildEnumOptionsByFieldKey(
  referenceByKey: DatapointReferenceMap | undefined | null,
): Record<string, EnumSelectOption[]> {
  const ref = referenceByKey ?? {};
  const out: Record<string, EnumSelectOption[]> = {};

  for (const [fieldKey, binding] of Object.entries(CARRIER_FORM_FIELD_ENUM)) {
    const dpKey = datapointKeyForOpenApiSchema(binding.schema);
    const inner = ref[dpKey] ?? ref[dpKey.toLowerCase()];
    const fromApi =
      inner && Object.keys(inner).length > 0
        ? referenceMapToOptions(
            inner,
            binding.schema === "YnEnum" ? "YnEnum" : undefined,
          )
        : [];
    if (fromApi.length > 0) {
      out[fieldKey] = fromApi;
      continue;
    }
    out[fieldKey] = [...optionsForOpenApiEnumSchema(binding.schema)];
  }

  return out;
}

/** Options for create-draft fields (top-level keys: entityType, lineOfBusiness, productTypes). */
export function createDraftEnumOptions(
  referenceByKey: DatapointReferenceMap | undefined | null,
): Record<string, EnumSelectOption[]> {
  const full = buildEnumOptionsByFieldKey(referenceByKey);
  return {
    entityType: full.entityType ?? [],
    lineOfBusiness: full.lineOfBusiness ?? [],
    productTypes: full.productTypes ?? [],
  };
}

export function allowedValuesFromOptions(opts: EnumSelectOption[]): Set<string> {
  return new Set(opts.map((o) => o.value));
}

export function allowedValuesForSchema(
  referenceByKey: DatapointReferenceMap | undefined | null,
  schema: OpenApiEnumSchemaName,
): Set<string> {
  const dpKey = datapointKeyForOpenApiSchema(schema);
  const ref = referenceByKey ?? {};
  const inner = ref[dpKey] ?? ref[dpKey.toLowerCase()];
  const opts = referenceMapToOptions(
    inner,
    schema === "YnEnum" ? "YnEnum" : undefined,
  );
  if (opts.length > 0) return allowedValuesFromOptions(opts);
  return new Set(optionsForOpenApiEnumSchema(schema).map((o) => o.value));
}
