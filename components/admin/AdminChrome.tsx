import { CHAT_AGENT_TITLE } from "@/lib/branding";
import Link from "next/link";
import type { ReactNode } from "react";

export function AdminChrome({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface shadow-[var(--card-shadow-sm)]">
        <div className="h-1 w-full bg-accent" aria-hidden />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-muted">
              Admin console
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {CHAT_AGENT_TITLE}
            </h1>
            <p className="mt-1 text-xs text-accent-muted">
              Carrier test harness — direct API operations (no chat).
            </p>
          </div>
          <Link
            href="/"
            className="ui-btn-secondary shrink-0 px-4 text-center text-sm"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
        {title ? (
          <h2 className="mb-6 text-base font-semibold text-foreground">{title}</h2>
        ) : null}
        {children}
      </main>
    </div>
  );
}
