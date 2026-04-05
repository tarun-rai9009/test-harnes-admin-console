"use client";

import { AssistantAvatar } from "@/components/chat/AssistantAvatar";

/**
 * Shown before the first assistant message arrives (session bootstrap).
 */
export function ChatInitialLoading() {
  return (
    <div className="flex gap-3" aria-busy="true" aria-live="polite">
      <AssistantAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        <div className="space-y-2 rounded-xl rounded-tl-md border border-border bg-surface px-4 py-4 shadow-[var(--card-shadow-sm)]">
          <div className="h-2.5 w-full max-w-[220px] animate-pulse rounded-full bg-border" />
          <div className="h-2.5 w-full max-w-[300px] animate-pulse rounded-full bg-border/80" />
          <div className="h-2.5 w-full max-w-[140px] animate-pulse rounded-full bg-border/60" />
        </div>
        <p className="text-sm text-accent-muted">
          Loading…
        </p>
      </div>
    </div>
  );
}
