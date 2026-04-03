/**
 * Environment helpers. Secrets stay server-side — never import this module from client components
 * for values that must remain private; prefer `server-only` modules under `lib/zinnia/`.
 */

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** All vars required for OAuth + API base URL (live Zinnia integration). */
export function isZinniaConfigured(): boolean {
  return (
    isNonEmpty(process.env.ZINNIA_BASE_URL) &&
    isNonEmpty(process.env.ZINNIA_TOKEN_URL) &&
    isNonEmpty(process.env.ZINNIA_CLIENT_ID) &&
    isNonEmpty(process.env.ZINNIA_CLIENT_SECRET)
  );
}

export function getZinniaBaseUrl(): string | undefined {
  const v = process.env.ZINNIA_BASE_URL;
  return isNonEmpty(v) ? v.trim() : undefined;
}

export function getZinniaTokenUrl(): string | undefined {
  const v = process.env.ZINNIA_TOKEN_URL;
  return isNonEmpty(v) ? v.trim() : undefined;
}

/**
 * OAuth token request `audience` (Auth0-style). Defaults to dev API host if unset.
 * @example https://dev.api.zinnia.io
 */
export function getZinniaTokenAudience(): string {
  const v = process.env.ZINNIA_TOKEN_AUDIENCE;
  return isNonEmpty(v) ? v.trim() : "https://dev.api.zinnia.io";
}

/** OpenAI key for the AI layer (server-side only). */
export function getOpenAiApiKey(): string | undefined {
  const v = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  return isNonEmpty(v) ? v.trim() : undefined;
}

/** True when the AI layer has no API key (server-side). */
export function isMockMode(): boolean {
  return !getOpenAiApiKey();
}
