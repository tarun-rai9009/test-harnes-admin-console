"use client";

import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { CHAT_AGENT_TITLE } from "@/lib/branding";

export function TypingIndicator() {
  return (
    <div
      className="flex justify-start gap-3"
      aria-live="polite"
      aria-busy="true"
    >
      <AssistantAvatar className="mt-1" />
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl rounded-tl-sm border border-border bg-surface px-4 py-3.5 shadow-[var(--card-shadow-sm)]">
        <span className="sr-only">{CHAT_AGENT_TITLE} is working</span>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/50 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/50 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/50" />
        </div>
        <span className="text-sm text-accent-muted">
          Working…
        </span>
      </div>
    </div>
  );
}
