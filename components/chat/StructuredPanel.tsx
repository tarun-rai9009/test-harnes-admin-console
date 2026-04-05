"use client";

import { CarrierDetailSections } from "@/components/chat/CarrierDetailSections";
import { CreateCarrierDraftForm } from "@/components/chat/CreateCarrierDraftForm";
import { UpdateCarrierFlowPanel } from "@/components/chat/UpdateCarrierFlowPanel";
import type {
  ChatAssistantApiPayload,
  ChatSummaryCard,
} from "@/types/chat-assistant";
import { labelForFieldKey } from "@/components/chat/fieldLabels";

type Props = Pick<
  ChatAssistantApiPayload,
  | "summaryCard"
  | "resultData"
  | "missingFields"
  | "awaitingConfirmation"
  | "responseType"
  | "workflowName"
  | "workflowId"
  | "createCarrierDraftForm"
  | "updateCarrierFlow"
> & {
  onConfirmYes?: () => void;
  onConfirmNo?: () => void;
  onSubmitCreateCarrierDraftForm?: (values: Record<string, string>) => void;
  onSubmitUpdateCarrierCode?: (code: string) => void;
  onSelectUpdateCarrierCategory?: (categoryId: string) => void;
  onSubmitUpdateCarrierSectionForm?: (values: Record<string, string>) => void;
  onUpdateCarrierChooseDifferentSection?: () => void;
  onBackUpdateCarrierToCode?: () => void;
  onBackUpdateCarrierToCategories?: () => void;
  disabled?: boolean;
  className?: string;
};

function SummaryCardView({
  card,
  variant = "default",
}: {
  card: ChatSummaryCard;
  variant?: "default" | "success";
}) {
  const shell =
    variant === "success"
      ? "rounded-xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-5 py-4 shadow-[var(--card-shadow-sm)]"
      : "ui-card";

  const hasLines = Boolean(card.lines?.length);
  const hasFields = Boolean(card.fields?.length);
  const borderBeforeFields = hasLines;
  const borderBeforeTable = hasLines || hasFields;

  return (
    <div className={shell}>
      {card.title ? (
        <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-accent-muted">
          {card.title}
        </p>
      ) : null}
      {card.lines?.length ? (
        <ul className="mt-2 space-y-2 text-[15px] leading-snug text-foreground/90">
          {card.lines.map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent/35" aria-hidden />
              <span className="whitespace-pre-wrap">{line.replace(/^\*\*|\*\*$/g, "").replace(/\*\*/g, "")}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.fields?.length ? (
        <dl
          className={
            borderBeforeFields
              ? "mt-4 space-y-3 border-t border-border/60 pt-4"
              : "mt-1 space-y-3"
          }
        >
          {card.fields.map((f, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,40%)_1fr] sm:gap-4"
            >
              <dt className="text-sm font-medium text-accent-muted">{f.label}</dt>
              <dd className="text-sm leading-relaxed text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {card.table?.columns?.length && card.table.rows.length ? (
        <div
          className={
            borderBeforeTable
              ? "mt-4 overflow-x-auto border-t border-border/60 pt-4"
              : "mt-2 overflow-x-auto"
          }
        >
          <table className="w-full min-w-[260px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                {card.table.columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-2 py-2.5 pr-4 font-semibold text-foreground first:pl-0"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.table.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-border/80 last:border-0 odd:bg-surface-muted/50"
                >
                  {card.table!.columns.map((col) => (
                    <td
                      key={col.id}
                      className="px-2 py-2.5 pr-4 align-top text-foreground/90 first:pl-0"
                    >
                      {row[col.id] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const MAX_NEST_DEPTH = 14;

function LeafText({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <>—</>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value === "number") return <>{value}</>;
  if (typeof value === "string") {
    const t = value.trim();
    return (
      <span className="whitespace-pre-wrap break-words">{t.length ? value : "—"}</span>
    );
  }
  return <span className="break-all">{String(value)}</span>;
}

function ObjectFieldsView({
  data,
  depth,
}: {
  data: Record<string, unknown>;
  depth: number;
}) {
  const entries = Object.entries(data).filter(
    ([k]) => k !== "mock" && !k.startsWith("_"),
  );
  if (entries.length === 0) return null;
  return (
    <dl className="space-y-3">
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,32%)_1fr] sm:gap-3"
        >
          <dt className="text-sm font-medium text-accent-muted">
            {labelForFieldKey(key)}
          </dt>
          <dd className="min-w-0 text-sm leading-relaxed text-foreground">
            <NestedResultValue value={val} depth={depth} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NestedResultValue({
  value,
  depth,
}: {
  value: unknown;
  depth: number;
}) {
  if (depth > MAX_NEST_DEPTH) {
    return <span className="italic text-accent-muted">…</span>;
  }
  if (value === null || value === undefined) return <>—</>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <>—</>;
    const first = value[0];
    if (isPlainObject(first)) {
      return (
        <div className="mt-0.5 space-y-3">
          {value.map((item, i) =>
            isPlainObject(item) ? (
              <div
                key={i}
                className="rounded-lg border border-border bg-surface-muted/90 p-3"
              >
                <ObjectFieldsView data={item} depth={depth + 1} />
              </div>
            ) : (
              <div key={i} className="text-sm">
                <NestedResultValue value={item} depth={depth + 1} />
              </div>
            ),
          )}
        </div>
      );
    }
    return (
      <span className="break-words text-foreground/90">
        {value.map((x, i) => (
          <span key={i}>
            {i > 0 ? ", " : null}
            <NestedResultValue value={x} depth={depth + 1} />
          </span>
        ))}
      </span>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="mt-1 border-l-2 border-accent/30 pl-3">
        <ObjectFieldsView data={value} depth={depth + 1} />
      </div>
    );
  }

  return <LeafText value={value} />;
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.map(String).join(", ");
  if (isPlainObject(val)) return JSON.stringify(val);
  return String(val);
}

function ResultDataView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-border bg-surface-muted/90 px-4 py-3 text-sm text-accent-muted">
          No rows.
        </p>
      );
    }
    const first = data[0];
    if (isPlainObject(first)) {
      const columns = Object.keys(first).filter((k) => !k.startsWith("_"));
      return (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-[var(--card-shadow-sm)]">
          <table className="w-full min-w-[280px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 font-semibold text-foreground capitalize"
                  >
                    {labelForFieldKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) =>
                isPlainObject(row) ? (
                  <tr key={ri} className="border-b border-border last:border-0">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-foreground/90">
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="list-inside list-disc space-y-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-[var(--card-shadow-sm)]">
        {data.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data).filter(
      ([k]) => k !== "mock" && !k.startsWith("_"),
    );
    if (entries.length === 0) return null;
    return (
      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4 shadow-[var(--card-shadow-sm)]">
        <ObjectFieldsView data={data} depth={0} />
      </div>
    );
  }

  return (
    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-[var(--card-shadow-sm)]">
      <LeafText value={data} />
    </p>
  );
}

export function StructuredPanel({
  summaryCard,
  resultData,
  missingFields,
  awaitingConfirmation,
  responseType,
  workflowName,
  workflowId,
  createCarrierDraftForm,
  updateCarrierFlow,
  onConfirmYes,
  onConfirmNo,
  onSubmitCreateCarrierDraftForm,
  onSubmitUpdateCarrierCode,
  onSelectUpdateCarrierCategory,
  onSubmitUpdateCarrierSectionForm,
  onUpdateCarrierChooseDifferentSection,
  onBackUpdateCarrierToCode,
  onBackUpdateCarrierToCategories,
  disabled,
  className = "",
}: Props) {
  const showResult =
    responseType === "success" && resultData !== undefined && resultData !== null;

  return (
    <div
      className={["space-y-4 border-t border-border/60 pt-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      {workflowName ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-accent-muted">Task</span>
          <span className="inline-flex rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
            {workflowName}
          </span>
        </div>
      ) : null}

      {summaryCard &&
      (summaryCard.title ||
        summaryCard.lines?.length ||
        summaryCard.fields?.length ||
        summaryCard.table?.rows?.length) ? (
        <SummaryCardView
          card={summaryCard}
          variant={
            responseType === "success" &&
            (Boolean(summaryCard.fields?.length) ||
              Boolean(summaryCard.table?.rows?.length) ||
              Boolean(summaryCard.lines?.length))
              ? "success"
              : "default"
          }
        />
      ) : null}

      {createCarrierDraftForm &&
      onSubmitCreateCarrierDraftForm &&
      createCarrierDraftForm.fields.length > 0 ? (
        <CreateCarrierDraftForm
          form={createCarrierDraftForm}
          disabled={disabled}
          onSubmit={onSubmitCreateCarrierDraftForm}
        />
      ) : null}

      {updateCarrierFlow &&
      onSubmitUpdateCarrierCode &&
      onSelectUpdateCarrierCategory &&
      onSubmitUpdateCarrierSectionForm ? (
        <UpdateCarrierFlowPanel
          flow={updateCarrierFlow}
          disabled={disabled}
          onSubmitCarrierCode={onSubmitUpdateCarrierCode}
          onSelectCategory={onSelectUpdateCarrierCategory}
          onSubmitSectionForm={onSubmitUpdateCarrierSectionForm}
          onBackToCarrierCode={onBackUpdateCarrierToCode}
          onBackToCategories={onBackUpdateCarrierToCategories}
        />
      ) : null}

      {missingFields && missingFields.length > 0 ? (
        <div className="ui-alert-warning">
          <p className="text-sm font-semibold text-[color:var(--warning-text)]">
            Still needed
          </p>
          <p className="mt-1 text-sm text-[color:var(--warning-text)]/90">
            Provide:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--warning-text)]">
            {missingFields.map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--warning-icon)]"
                  aria-hidden
                />
                <span>{labelForFieldKey(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {awaitingConfirmation && responseType === "confirm" ? (
        <div className="rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-bg)] px-5 py-4 shadow-[var(--card-shadow-sm)]">
          <p className="text-[15px] font-semibold text-foreground">
            {workflowId === "update_carrier"
              ? "Apply this section?"
              : "Ready to save?"}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-accent-muted">
            {workflowId === "update_carrier"
              ? "Confirm to send this section. You can update more after."
              : "Confirm to save."}
          </p>
          {workflowId === "update_carrier" &&
          onUpdateCarrierChooseDifferentSection ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={disabled}
                onClick={onUpdateCarrierChooseDifferentSection}
                className="ui-btn-ghost disabled:opacity-50"
              >
                Choose a different section
              </button>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={onConfirmYes}
              className="ui-btn-primary"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onConfirmNo}
              className="ui-btn-secondary"
            >
              {workflowId === "update_carrier"
                ? "Edit form again"
                : "Not yet"}
            </button>
          </div>
        </div>
      ) : null}

      {showResult ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/80 p-3">
          {workflowName === "Carrier lookup" ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent-muted">
              Full record
            </p>
          ) : null}
          {workflowName === "New carrier setup" ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent-muted">
              Saved draft (full response)
            </p>
          ) : null}
          {workflowName === "Carrier update" ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent-muted">
              Updated carrier (full response)
            </p>
          ) : null}
          {workflowId === "find_carrier" ? (
            <CarrierDetailSections data={resultData} />
          ) : (
            <ResultDataView data={resultData} />
          )}
        </div>
      ) : null}
    </div>
  );
}
