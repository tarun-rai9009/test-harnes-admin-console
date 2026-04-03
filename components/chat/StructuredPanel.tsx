"use client";

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
> & {
  onConfirmYes?: () => void;
  onConfirmNo?: () => void;
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
      ? "rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 to-emerald-50/50 px-5 py-4 shadow-[var(--card-shadow)]"
      : "rounded-2xl border border-border/80 bg-surface px-5 py-4 shadow-[var(--card-shadow)]";

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
              <tr className="border-b border-border bg-background/80">
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
                  className="border-b border-border/50 last:border-0 odd:bg-background/40"
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

function ResultDataView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border/90 bg-background/80 px-4 py-3 text-sm text-accent-muted">
          Nothing to show in this list yet.
        </p>
      );
    }
    const first = data[0];
    if (isPlainObject(first)) {
      const columns = Object.keys(first).filter((k) => !k.startsWith("_"));
      return (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
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
      <ul className="list-inside list-disc space-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
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
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <dl className="divide-y divide-border">
          {entries.map(([key, val]) => (
            <div
              key={key}
              className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[minmax(0,34%)_1fr] sm:gap-4"
            >
              <dt className="text-sm font-medium text-accent-muted">
                {labelForFieldKey(key)}
              </dt>
              <dd className="text-sm text-foreground">{formatCell(val)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      {String(data)}
    </p>
  );
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.map(String).join(", ");
  if (isPlainObject(val)) return JSON.stringify(val);
  return String(val);
}

export function StructuredPanel({
  summaryCard,
  resultData,
  missingFields,
  awaitingConfirmation,
  responseType,
  workflowName,
  onConfirmYes,
  onConfirmNo,
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
          <span className="text-xs font-medium text-accent-muted">Working on</span>
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
              Boolean(summaryCard.table?.rows?.length))
              ? "success"
              : "default"
          }
        />
      ) : null}

      {missingFields && missingFields.length > 0 ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 shadow-[var(--card-shadow)]">
          <p className="text-sm font-semibold text-amber-950">
            A few details still needed
          </p>
          <p className="mt-1 text-sm text-amber-900/85">
            When you’re ready, share the following so we can continue.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-950/90">
            {missingFields.map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/80" aria-hidden />
                <span>{labelForFieldKey(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {awaitingConfirmation && responseType === "confirm" ? (
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4 shadow-[var(--card-shadow)]">
          <p className="text-[15px] font-semibold text-foreground">
            Ready to save?
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-accent-muted">
            Please double-check the summary. If you confirm, we’ll save this to your carrier records.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={onConfirmYes}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yes, save it
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onConfirmNo}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : null}

      {showResult ? (
        <div className="rounded-2xl border border-dashed border-border/90 bg-background/60 p-3">
          <ResultDataView data={resultData} />
        </div>
      ) : null}
    </div>
  );
}
