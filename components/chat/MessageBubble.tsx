"use client";

import type { ChatMessage } from "@/types/chat";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { CHAT_AGENT_TITLE } from "@/lib/branding";

type Props = {
  message: ChatMessage;
  variant?: "default" | "success" | "error";
  /**
   * `bubbleOnly`: assistant text only — parent row supplies the avatar (e.g. ChatShell + panel).
   */
  assistantLayout?: "default" | "bubbleOnly";
};

export function MessageBubble({
  message,
  variant = "default",
  assistantLayout = "default",
}: Props) {
  const isUser = message.role === "user";

  const assistantTone =
    variant === "error"
      ? "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-foreground shadow-[var(--card-shadow-sm)]"
      : variant === "success"
        ? "border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-foreground shadow-[var(--card-shadow-sm)]"
        : "border-border bg-surface text-foreground shadow-[var(--card-shadow-sm)]";

  if (!isUser && !message.content.trim()) {
    return null;
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[min(88%,42rem)] rounded-xl rounded-br-sm border border-[color:var(--user-bubble-border)] bg-[color:var(--user-bubble-bg)] px-[1.125rem] py-3.5 text-[15px] leading-[1.55] text-foreground shadow-[var(--card-shadow-sm)]"
          role="article"
          aria-label="Your message"
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const bubble = (
    <div
      className={`max-w-[min(92%,50rem)] rounded-xl rounded-tl-sm border px-[1.125rem] py-3.5 text-[15px] leading-[1.55] ${assistantTone}`}
      role="article"
      aria-label={`${CHAT_AGENT_TITLE} message`}
    >
      <p className="whitespace-pre-wrap text-foreground/95">{message.content}</p>
    </div>
  );

  if (assistantLayout === "bubbleOnly") {
    return bubble;
  }

  return (
    <div className="flex justify-start gap-3">
      <AssistantAvatar className="mt-1" />
      {bubble}
    </div>
  );
}
