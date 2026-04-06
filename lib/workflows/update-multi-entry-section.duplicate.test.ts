import { describe, expect, it } from "vitest";
import {
  duplicateMultiEntryTypeRowErrors,
  emptyFlatRow,
  MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE,
} from "@/lib/workflows/update-multi-entry-section";

describe("duplicateMultiEntryTypeRowErrors", () => {
  it("flags the second row when two rows share the same type", () => {
    const row0 = emptyFlatRow("addresses");
    row0.addr_addressType = "HOME";
    const row1 = emptyFlatRow("addresses");
    row1.addr_addressType = "HOME";
    const e = duplicateMultiEntryTypeRowErrors([row0, row1], "addresses");
    expect(e[0]).toBeUndefined();
    expect(e[1]?.addr_addressType).toBe(MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE);
  });

  it("returns no errors for a single row with a type", () => {
    const row0 = emptyFlatRow("addresses");
    row0.addr_addressType = "HOME";
    expect(
      Object.keys(duplicateMultiEntryTypeRowErrors([row0], "addresses")),
    ).toHaveLength(0);
  });

  it("flags rows 1 and 2 when three rows share the same identifier type", () => {
    const rows = [0, 1, 2].map(() => {
      const r = emptyFlatRow("identifiers");
      r.id_identifierType = "X";
      return r;
    });
    const e = duplicateMultiEntryTypeRowErrors(rows, "identifiers");
    expect(e[0]).toBeUndefined();
    expect(e[1]?.id_identifierType).toBe(MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE);
    expect(e[2]?.id_identifierType).toBe(MULTI_ENTRY_DUPLICATE_TYPE_MESSAGE);
  });

  it("ignores rows with an empty type for duplicate detection", () => {
    const a = emptyFlatRow("phones");
    const b = emptyFlatRow("phones");
    b.phone_phoneType = "MOBILE";
    const e = duplicateMultiEntryTypeRowErrors([a, b], "phones");
    expect(Object.keys(e)).toHaveLength(0);
  });
});
