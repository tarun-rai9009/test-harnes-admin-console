"use client";

import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatInitialLoading } from "@/components/chat/ChatInitialLoading";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { StructuredPanel } from "@/components/chat/StructuredPanel";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { getOrCreateSessionId, rotateSessionId } from "@/components/chat/sessionId";
import type { ChatAssistantApiPayload } from "@/types/chat-assistant";
import type { ChatMessage } from "@/types/chat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StructuredState = Pick<
  ChatAssistantApiPayload,
  | "summaryCard"
  | "resultData"
  | "missingFields"
  | "awaitingConfirmation"
  | "responseType"
  | "workflowName"
>;

function pickStructured(data: ChatAssistantApiPayload): StructuredState {
  return {
    summaryCard: data.summaryCard,
    resultData: data.resultData,
    missingFields: data.missingFields,
    awaitingConfirmation: data.awaitingConfirmation,
    responseType: data.responseType,
    workflowName: data.workflowName,
  };
}

export function ChatShell() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [structured, setStructured] = useState<StructuredState | null>(null);
  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const applySuccessPayload = useCallback((data: ChatAssistantApiPayload & { conversationHistory: ChatMessage[] }) => {
    setMessages(data.conversationHistory);
    setStructured(pickStructured(data));
    setBannerError(null);
  }, []);

  const callChat = useCallback(
    async (message: string) => {
      if (!sessionId) return;
      setLoading(true);
      setBannerError(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message }),
        });
        const data = await res.json();
        if (!res.ok) {
          setBannerError(
            typeof data.message === "string"
              ? data.message
              : data.error || "Something went wrong.",
          );
          return;
        }
        applySuccessPayload(data);
      } catch {
        setBannerError(
          "We couldn’t reach the assistant. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [sessionId, applySuccessPayload],
  );

  useEffect(() => {
    if (!sessionId || initialized.current) return;
    initialized.current = true;
    void callChat("");
  }, [sessionId, callChat]);

  const sendUserMessage = useCallback(
    (text: string) => {
      void callChat(text);
    },
    [callChat],
  );

  const handleClear = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setBannerError(null);
    try {
      await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      /* still rotate locally */
    }
    const newId = rotateSessionId();
    setSessionId(newId);
    setStructured(null);
    initialized.current = false;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newId, message: "" }),
      });
      const data = await res.json();
      if (res.ok) {
        applySuccessPayload(data);
      } else {
        setBannerError(
          typeof data.message === "string"
            ? data.message
            : "Could not start a new conversation.",
        );
      }
    } catch {
      setBannerError("Could not start a new conversation.");
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, [sessionId, applySuccessPayload]);

  const bubbleVariant = (index: number): "default" | "success" | "error" => {
    if (index !== lastAssistantIndex || !structured) return "default";
    if (structured.responseType === "error") return "error";
    if (structured.responseType === "success") return "success";
    return "default";
  };

  const showInitialLoad = loading && messages.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/80 bg-surface/95 px-4 py-5 shadow-[var(--card-shadow)] backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-muted">
              Internal tool
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
              Carrier operations assistant
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-accent-muted">
              Ask in plain language. I’ll guide you through carrier setup, lookups, lists, and
              updates — no technical steps on your side.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={loading}
            className="shrink-0 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New conversation
          </button>
        </div>
      </header>

      {bannerError ? (
        <div
          className="border-b border-red-200/80 bg-red-50/95 px-4 py-3 text-center text-sm leading-relaxed text-red-950 sm:px-8"
          role="alert"
        >
          {bannerError}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[var(--card-shadow)]">
          <div className="border-b border-border/70 bg-background/40 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-foreground">Conversation</p>
            <p className="mt-0.5 text-xs text-accent-muted">
              Your messages stay in this session until you start a new conversation.
            </p>
          </div>

          <div className="min-h-[min(58vh,480px)] flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-6">
              {showInitialLoad ? <ChatInitialLoading /> : null}

              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <div key={m.id} className="flex gap-3">
                    <AssistantAvatar className="mt-1" />
                    <div className="min-w-0 flex-1 space-y-0">
                      <MessageBubble
                        message={m}
                        variant={bubbleVariant(i)}
                        assistantLayout="bubbleOnly"
                      />
                      {i === lastAssistantIndex && structured ? (
                        <StructuredPanel
                          className="mt-3"
                          {...structured}
                          disabled={loading}
                          onConfirmYes={() => sendUserMessage("yes")}
                          onConfirmNo={() => sendUserMessage("no")}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div key={m.id}>
                    <MessageBubble message={m} />
                  </div>
                ),
              )}
              {loading && messages.length > 0 ? <TypingIndicator /> : null}
              <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
            </div>
          </div>

          <ChatComposer
            onSend={sendUserMessage}
            disabled={loading || !sessionId}
            placeholder="e.g. I need to add a new carrier, or show me all carriers"
          />
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-accent-muted">
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-[11px] text-foreground/80">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-[11px] text-foreground/80">
            Shift+Enter
          </kbd>{" "}
          for a new line
        </p>
      </main>
    </div>
  );
}
