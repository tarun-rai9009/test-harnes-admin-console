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

/** OpenAI API key for api.openai.com (Bearer), or Azure key when using Azure. */
export function getOpenAiApiKey(): string | undefined {
  const v = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  return isNonEmpty(v) ? v.trim() : undefined;
}

/** When set, chat completions use Azure OpenAI instead of api.openai.com. */
export function usesAzureOpenAi(): boolean {
  return isNonEmpty(process.env.AZURE_OPENAI_ENDPOINT);
}

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Azure resource endpoint, e.g. https://your-resource.openai.azure.com */
export function getAzureOpenAiEndpoint(): string | undefined {
  const v = process.env.AZURE_OPENAI_ENDPOINT;
  return isNonEmpty(v) ? trimTrailingSlashes(v.trim()) : undefined;
}

/**
 * Azure deployment name for chat completions.
 * Prefer AZURE_OPENAI_DEPLOYMENT; falls back to OPENAI_MODEL if set.
 */
export function getAzureOpenAiDeployment(): string | undefined {
  const v =
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    process.env.OPENAI_MODEL?.trim();
  return isNonEmpty(v) ? v : undefined;
}

/** Azure API version query param (see Azure OpenAI REST docs). */
export function getAzureOpenAiApiVersion(): string {
  const v = process.env.AZURE_OPENAI_API_VERSION;
  return isNonEmpty(v) ? v.trim() : "2024-08-01-preview";
}

/** Key for Azure `api-key` header (or OPENAI_API_KEY / AI_API_KEY). */
export function getAzureOpenAiApiKey(): string | undefined {
  const v =
    process.env.AZURE_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.AI_API_KEY;
  return isNonEmpty(v) ? v.trim() : undefined;
}

/** AI intent/extraction is available (OpenAI.com or Azure with endpoint + key). */
export function isAiLayerConfigured(): boolean {
  if (usesAzureOpenAi()) {
    return (
      isNonEmpty(getAzureOpenAiEndpoint()) &&
      isNonEmpty(getAzureOpenAiApiKey())
    );
  }
  return isNonEmpty(getOpenAiApiKey());
}

/** True when the AI layer cannot run (no key / incomplete Azure config). */
export function isMockMode(): boolean {
  return !isAiLayerConfigured();
}
