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
    <div className="flex items-end gap-3 border-t border-border bg-surface-muted/60 p-4 sm:p-5">
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
        className="ui-composer-input"
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
        className="ui-btn-primary h-12 shrink-0 px-6"
      >
        Send
      </button>
    </div>
  );
}
