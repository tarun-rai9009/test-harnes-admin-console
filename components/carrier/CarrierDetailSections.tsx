"use client";

import { labelForFieldKey } from "@/components/carrier/fieldLabels";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Display null, empty string, or empty array as N/A (carrier lookup spec). */
export function fmtCarrierDetail(v: unknown): string {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === "string" && v.trim() === "") return "N/A";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "N/A";
    return v
      .map((x) =>
        isPlainObject(x)
          ? JSON.stringify(x)
          : x === null || x === undefined
            ? "N/A"
            : String(x),
      )
      .join(", ");
  }
  if (isPlainObject(v)) return JSON.stringify(v);
  return String(v);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-card">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-accent-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function RowsDl({ rows }: { rows: { label: string; value: string }[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-accent-muted">N/A</p>;
  }
  return (
    <dl className="space-y-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,40%)_1fr] sm:gap-4"
        >
          <dt className="text-sm font-medium text-accent-muted">{r.label}</dt>
          <dd className="text-sm leading-relaxed text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function normalizeUrlRows(base: Record<string, unknown>): Record<string, unknown>[] {
  const u = base.urls;
  if (u === undefined || u === null) return [];
  if (Array.isArray(u)) return u.filter(isPlainObject) as Record<string, unknown>[];
  if (isPlainObject(u)) return [u];
  return [];
}

function objectArray(
  v: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  return v.filter(isPlainObject) as Record<string, unknown>[];
}

function ObjectEntryCards({
  title,
  items,
}: {
  title: string;
  items: Record<string, unknown>[];
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3">
        {title.trim() ? (
          <p className="text-xs font-semibold text-foreground/80">{title}</p>
        ) : null}
        <p className="mt-1 text-sm text-accent-muted">N/A</p>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {title.trim() ? (
        <p className="text-xs font-semibold text-foreground/80">{title}</p>
      ) : null}
      <div className="space-y-2">
        {items.map((obj, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface-muted/90 p-3"
          >
            <dl className="space-y-2">
              {Object.entries(obj)
                .filter(([k]) => !k.startsWith("_"))
                .map(([k, val]) => (
                  <div
                    key={k}
                    className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3"
                  >
                    <dt className="text-sm font-medium text-accent-muted">
                      {labelForFieldKey(k)}
                    </dt>
                    <dd className="text-sm leading-relaxed text-foreground">
                      {fmtCarrierDetail(val)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROOT_RESERVED = new Set([
  "id",
  "carrierCode",
  "carrierName",
  "version",
  "status",
  "base",
  "connectors",
  "addresses",
  "phones",
  "emails",
  "createdBy",
  "createdAt",
  "updatedBy",
  "updatedAt",
  "mock",
]);

const BASE_CONFIG_KEYS = new Set([
  "urls",
  "identifiers",
  "regulatory",
  "businessHolidays",
  "hoursOfOperation",
]);

export type CarrierDetailSectionsVariant = "full" | "basic";

type CarrierDetailSectionsProps = {
  data: unknown;
  /** `"basic"` — only the Basic information card (e.g. create-draft success). Default: full sectioned layout. */
  variant?: CarrierDetailSectionsVariant;
};

/**
 * Sectioned, card layout for GET /carriers/{code} payloads (full Zinnia record).
 */
export function CarrierDetailSections({
  data,
  variant = "full",
}: CarrierDetailSectionsProps) {
  if (!isPlainObject(data)) {
    return (
      <p className="text-sm text-accent-muted">
        {fmtCarrierDetail(data)}
      </p>
    );
  }

  const root = data;
  const base = isPlainObject(root.base) ? root.base : {};

  const basicRows: { label: string; value: string }[] = [];
  basicRows.push({ label: "ID", value: fmtCarrierDetail(root.id) });
  basicRows.push({
    label: "Carrier code",
    value: fmtCarrierDetail(root.carrierCode),
  });
  basicRows.push({
    label: "Carrier name",
    value: fmtCarrierDetail(root.carrierName),
  });

  for (const [k, v] of Object.entries(base)) {
    if (BASE_CONFIG_KEYS.has(k)) continue;
    if (k === "carrierName" && root.carrierName != null && root.carrierName !== "")
      continue;
    if (isPlainObject(v)) continue;
    if (Array.isArray(v) && k !== "productTypes") continue;
    basicRows.push({ label: labelForFieldKey(k), value: fmtCarrierDetail(v) });
  }

  if (variant === "basic") {
    return (
      <div className="space-y-4">
        <SectionCard title="Basic information">
          <RowsDl rows={basicRows} />
        </SectionCard>
      </div>
    );
  }

  const addresses = objectArray(root.addresses);
  const phones = objectArray(root.phones);
  const emails = objectArray(root.emails);

  const urlRows = normalizeUrlRows(base);
  const regulatory = objectArray(base.regulatory);
  const holidays = objectArray(base.businessHolidays);
  const hours = objectArray(base.hoursOfOperation);

  const metaRows: { label: string; value: string }[] = [
    { label: "Created by", value: fmtCarrierDetail(root.createdBy) },
    { label: "Created at", value: fmtCarrierDetail(root.createdAt) },
    { label: "Updated by", value: fmtCarrierDetail(root.updatedBy) },
    { label: "Updated at", value: fmtCarrierDetail(root.updatedAt) },
  ];

  for (const [k, v] of Object.entries(root)) {
    if (ROOT_RESERVED.has(k) || k.startsWith("_")) continue;
    metaRows.push({ label: labelForFieldKey(k), value: fmtCarrierDetail(v) });
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Basic information">
        <RowsDl rows={basicRows} />
      </SectionCard>

      <SectionCard title="Address details">
        {addresses.length === 0 ? (
          <p className="text-sm text-accent-muted">N/A</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-surface-muted/90 p-3"
              >
                <p className="mb-2 text-xs font-semibold text-foreground/75">
                  Address {i + 1}
                </p>
                <dl className="space-y-2">
                  {Object.entries(addr)
                    .filter(([key]) => !key.startsWith("_"))
                    .map(([key, val]) => (
                      <div
                        key={key}
                        className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3"
                      >
                        <dt className="text-sm font-medium text-accent-muted">
                          {labelForFieldKey(key)}
                        </dt>
                        <dd className="text-sm leading-relaxed text-foreground">
                          {fmtCarrierDetail(val)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Phone numbers">
        {phones.length === 0 ? (
          <p className="text-sm text-accent-muted">N/A</p>
        ) : (
          <ObjectEntryCards title="" items={phones} />
        )}
      </SectionCard>

      <SectionCard title="Email addresses">
        {emails.length === 0 ? (
          <p className="text-sm text-accent-muted">N/A</p>
        ) : (
          <ObjectEntryCards title="" items={emails} />
        )}
      </SectionCard>

      <SectionCard title="Status / configuration">
        <RowsDl
          rows={[
            { label: "Status", value: fmtCarrierDetail(root.status) },
            { label: "Version", value: fmtCarrierDetail(root.version) },
          ]}
        />
        {urlRows.length === 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold text-foreground/80">URLs</p>
            <p className="mt-1 text-sm text-accent-muted">N/A</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-foreground/80">URLs</p>
            {urlRows.map((row, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-surface-muted/90 p-3"
              >
                <dl className="space-y-2">
                  {Object.entries(row)
                    .filter(([k]) => !k.startsWith("_"))
                    .map(([k, val]) => (
                      <div
                        key={k}
                        className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3"
                      >
                        <dt className="text-sm font-medium text-accent-muted">
                          {labelForFieldKey(k)}
                        </dt>
                        <dd className="text-sm leading-relaxed text-foreground break-all">
                          {fmtCarrierDetail(val)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          </div>
        )}
        <ObjectEntryCards title="Regulatory" items={regulatory} />
        <ObjectEntryCards title="Business holidays" items={holidays} />
        <ObjectEntryCards title="Hours of operation" items={hours} />
      </SectionCard>

      <SectionCard title="Additional metadata">
        <RowsDl rows={metaRows} />
      </SectionCard>
    </div>
  );
}
