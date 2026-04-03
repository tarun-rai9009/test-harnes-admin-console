"use client";

type Props = {
  className?: string;
  /** Smaller in composer-adjacent contexts */
  size?: "md" | "sm";
};

/**
 * Simple visual anchor so assistant replies read as “help desk” not raw chat.
 */
export function AssistantAvatar({ className = "", size = "md" }: Props) {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-accent/12 font-semibold tracking-tight text-accent ${dim} ${className}`}
      aria-hidden
    >
      Ops
    </div>
  );
}
