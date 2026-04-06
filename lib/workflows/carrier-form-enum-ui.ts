/**
 * UI metadata for enum-backed carrier form fields (client + server safe).
 */

import { CARRIER_FORM_FIELD_ENUM } from "@/lib/workflows/carrier-form-enum-bindings";
import type { CreateCarrierDraftFormField } from "@/types/chat-assistant";
import { OPENAPI_ENUMS } from "@/types/zinnia/generated/openapi-enums";

export type EnumSelectOption = { value: string; label: string };

const YN_LABELS: Record<string, string> = { Y: "Yes", N: "No" };

export function optionsForOpenApiEnumSchema(
  schema: keyof typeof OPENAPI_ENUMS,
): EnumSelectOption[] {
  const raw = OPENAPI_ENUMS[schema] as readonly string[];
  if (schema === "YnEnum") {
    return raw.map((v) => ({
      value: v,
      label: YN_LABELS[v] ?? v,
    }));
  }
  return raw.map((v) => ({ value: v, label: v }));
}

export function enumFieldMetaForKey(key: string): Pick<
  CreateCarrierDraftFormField,
  "enumOptions" | "selectMultiple"
> | null {
  const binding = CARRIER_FORM_FIELD_ENUM[key];
  if (!binding) return null;
  return {
    enumOptions: optionsForOpenApiEnumSchema(binding.schema),
    selectMultiple: binding.mode === "multi",
  };
}

export function mergeEnumFieldMeta<
  T extends { key: string; label: string; required: boolean; multiline?: boolean },
>(fields: T[]): (T & Pick<CreateCarrierDraftFormField, "enumOptions" | "selectMultiple">)[] {
  return fields.map((f) => {
    const meta = enumFieldMetaForKey(f.key);
    if (!meta) return { ...f };
    return { ...f, ...meta, multiline: false };
  });
}
