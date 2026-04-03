"use client";

import type { ChatMessage } from "@/types/chat";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";

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
      ? "border-red-200/90 bg-red-50/90 text-foreground shadow-[var(--card-shadow)]"
      : variant === "success"
        ? "border-emerald-200/80 bg-emerald-50/80 text-foreground shadow-[var(--card-shadow)]"
        : "border-border/90 bg-surface text-foreground shadow-[var(--card-shadow)]";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[min(88%,30rem)] rounded-2xl rounded-br-sm border border-accent/15 bg-accent/[0.07] px-[1.125rem] py-3.5 text-[15px] leading-[1.55] text-foreground shadow-[var(--card-shadow)]"
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
      className={`max-w-[min(92%,36rem)] rounded-2xl rounded-tl-sm border px-[1.125rem] py-3.5 text-[15px] leading-[1.55] ${assistantTone}`}
      role="article"
      aria-label="Assistant message"
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
