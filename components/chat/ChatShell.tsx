"use client";

import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatInitialLoading } from "@/components/chat/ChatInitialLoading";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { StructuredPanel } from "@/components/chat/StructuredPanel";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { getOrCreateSessionId, rotateSessionId } from "@/components/chat/sessionId";
import { CHAT_AGENT_TITLE } from "@/lib/branding";
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
  | "workflowId"
  | "createCarrierDraftForm"
  | "updateCarrierFlow"
>;

function pickStructured(data: ChatAssistantApiPayload): StructuredState {
  return {
    summaryCard: data.summaryCard,
    resultData: data.resultData,
    missingFields: data.missingFields,
    awaitingConfirmation: data.awaitingConfirmation,
    responseType: data.responseType,
    workflowName: data.workflowName,
    workflowId: data.workflowId,
    createCarrierDraftForm: data.createCarrierDraftForm,
    updateCarrierFlow: data.updateCarrierFlow,
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

  type ChatExtras = {
    createCarrierDraftForm?: Record<string, unknown>;
    updateCarrierCode?: string;
    updateCarrierCategoryId?: string;
    updateCarrierCategoryIds?: string[];
    updateCarrierSectionForm?: Record<string, string>;
    updateCarrierNavigate?: "back_carrier_code" | "back_categories";
  };

  const callChat = useCallback(
    async (message: string, extras?: ChatExtras) => {
      if (!sessionId) return;
      setLoading(true);
      setBannerError(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message,
            ...(extras?.createCarrierDraftForm != null
              ? { createCarrierDraftForm: extras.createCarrierDraftForm }
              : {}),
            ...(extras?.updateCarrierCode != null
              ? { updateCarrierCode: extras.updateCarrierCode }
              : {}),
            ...(extras?.updateCarrierCategoryId != null
              ? { updateCarrierCategoryId: extras.updateCarrierCategoryId }
              : {}),
            ...(extras?.updateCarrierCategoryIds != null &&
            extras.updateCarrierCategoryIds.length > 0
              ? { updateCarrierCategoryIds: extras.updateCarrierCategoryIds }
              : {}),
            ...(extras?.updateCarrierSectionForm != null
              ? { updateCarrierSectionForm: extras.updateCarrierSectionForm }
              : {}),
            ...(extras?.updateCarrierNavigate != null
              ? { updateCarrierNavigate: extras.updateCarrierNavigate }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setBannerError(
            typeof data.message === "string"
              ? data.message
              : data.error || "Error.",
          );
          return;
        }
        applySuccessPayload(data);
      } catch {
        setBannerError(
          "Can’t reach the assistant. Check connection.",
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
            : "Couldn’t start a new chat.",
        );
      }
    } catch {
      setBannerError("Couldn’t start a new chat.");
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, [sessionId, applySuccessPayload]);

  const sendUserMessage = useCallback(
    (text: string) => {
      const t = text.trim();
      if (/^clear$/i.test(t)) {
        if (!sessionId || loading) return;
        void handleClear();
        return;
      }
      void callChat(text);
    },
    [callChat, handleClear, loading, sessionId],
  );

  const submitCreateCarrierDraftForm = useCallback(
    (values: Record<string, string>) => {
      void callChat("", { createCarrierDraftForm: values });
    },
    [callChat],
  );

  const submitUpdateCarrierCode = useCallback(
    (code: string) => {
      void callChat("", { updateCarrierCode: code });
    },
    [callChat],
  );

  const selectUpdateCarrierCategory = useCallback(
    (categoryId: string) => {
      void callChat("", { updateCarrierCategoryId: categoryId });
    },
    [callChat],
  );

  const submitSelectedUpdateCarrierCategories = useCallback(
    (categoryIds: string[]) => {
      void callChat("", { updateCarrierCategoryIds: categoryIds });
    },
    [callChat],
  );

  const submitUpdateCarrierSectionForm = useCallback(
    (values: Record<string, string>) => {
      void callChat("", { updateCarrierSectionForm: values });
    },
    [callChat],
  );

  const navigateUpdateCarrier = useCallback(
    (target: "back_carrier_code" | "back_categories") => {
      void callChat("", { updateCarrierNavigate: target });
    },
    [callChat],
  );

  const bubbleVariant = (index: number): "default" | "success" | "error" => {
    if (index !== lastAssistantIndex || !structured) return "default";
    if (structured.responseType === "error") return "error";
    if (structured.responseType === "success") return "success";
    return "default";
  };

  const showInitialLoad = loading && messages.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface shadow-[var(--card-shadow-sm)]">
        <div className="h-1 w-full bg-accent" aria-hidden />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-muted">
              Admin console
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-[1.375rem]">
              {CHAT_AGENT_TITLE}
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-accent-muted">
              Plain language: setup, lookup, list, reference data, updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={loading}
            className="ui-btn-secondary shrink-0 px-5"
          >
            New conversation
          </button>
        </div>
      </header>

      {bannerError ? (
        <div
          className="border-b border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-center text-sm leading-relaxed text-[color:var(--danger-text)] sm:px-8"
          role="alert"
        >
          {bannerError}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        <div className="ui-card-elevated flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border bg-surface-muted/70 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-foreground">{CHAT_AGENT_TITLE}</p>
            <p className="mt-0.5 text-xs text-accent-muted">
              Messages stay in this session until New conversation.
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
                          className={m.content.trim() ? "mt-3" : "mt-0"}
                          {...structured}
                          disabled={loading}
                          onConfirmYes={() => sendUserMessage("yes")}
                          onConfirmNo={() => sendUserMessage("no")}
                          onSubmitCreateCarrierDraftForm={
                            submitCreateCarrierDraftForm
                          }
                          onSubmitUpdateCarrierCode={submitUpdateCarrierCode}
                          onSelectUpdateCarrierCategory={
                            selectUpdateCarrierCategory
                          }
                          onSubmitSelectedUpdateCarrierCategories={
                            submitSelectedUpdateCarrierCategories
                          }
                          onSubmitUpdateCarrierSectionForm={
                            submitUpdateCarrierSectionForm
                          }
                          onUpdateCarrierChooseDifferentSection={() =>
                            navigateUpdateCarrier("back_categories")
                          }
                          onBackUpdateCarrierToCode={() =>
                            navigateUpdateCarrier("back_carrier_code")
                          }
                          onBackUpdateCarrierToCategories={() =>
                            navigateUpdateCarrier("back_categories")
                          }
                          onActionClick={sendUserMessage}
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
            placeholder="e.g. new carrier, lookup AB12, list carriers"
          />
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-accent-muted">
          <kbd className="ui-kbd">Enter</kbd> to send ·{" "}
          <kbd className="ui-kbd">Shift+Enter</kbd>{" "}
          for a new line
        </p>
      </main>
    </div>
  );
}
