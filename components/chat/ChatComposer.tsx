"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Describe what you need…",
}: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    taRef.current?.focus();
  }, [value, disabled, onSend]);

  return (
    <div className="flex items-end gap-3 border-t border-border/80 bg-background/30 p-4 sm:p-5">
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        ref={taRef}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="max-h-36 min-h-[48px] flex-1 resize-none rounded-xl border border-border/90 bg-surface px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-sm outline-none ring-accent/20 placeholder:text-accent-muted/65 focus:border-accent/35 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={submit}
        className="h-12 shrink-0 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
