import "server-only";

const MAX_BODY_PREVIEW = 8_000;

/** JSON-safe preview for logs; never includes secrets from env. */
export function previewRequestBody(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  try {
    const s =
      typeof body === "string" ? body : JSON.stringify(body, null, 0);
    if (s.length <= MAX_BODY_PREVIEW) return s;
    return `${s.slice(0, MAX_BODY_PREVIEW)}…[truncated ${s.length - MAX_BODY_PREVIEW} chars]`;
  } catch {
    return "[unserializable request body]";
  }
}

export function previewResponseBody(text: string, max = MAX_BODY_PREVIEW): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…[truncated ${text.length - max} chars]`;
}

export function logZinniaHttpInfo(payload: Record<string, unknown>): void {
  console.info("[zinnia-http]", payload);
}

export function logZinniaHttpError(payload: Record<string, unknown>): void {
  console.error("[zinnia-http]", payload);
}

export function serializeErrorCause(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    };
  }
  return { raw: String(cause) };
}
