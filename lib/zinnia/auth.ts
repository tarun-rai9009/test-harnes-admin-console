import "server-only";

import { getZinniaTokenAudience, isZinniaConfigured } from "@/lib/env";
import {
  logZinniaHttpError,
  logZinniaHttpInfo,
  previewResponseBody,
  serializeErrorCause,
} from "@/lib/zinnia/server-log";
import { OAuthTokenSuccess, ZinniaAuthError } from "@/lib/zinnia/types";

const TOKEN_REQUEST_TIMEOUT_MS = 15_000;
/** Refresh this many seconds before expiry. */
const EXPIRY_SKEW_SECONDS = 60;

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let cache: TokenCache | null = null;
let inflightRefresh: Promise<string> | null = null;

function readOAuthEnv() {
  const tokenUrl = process.env.ZINNIA_TOKEN_URL;
  const clientId = process.env.ZINNIA_CLIENT_ID;
  const clientSecret = process.env.ZINNIA_CLIENT_SECRET;
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("Zinnia OAuth env vars are not configured");
  }
  return { tokenUrl, clientId, clientSecret };
}

async function fetchClientCredentialsToken(): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const { tokenUrl, clientId, clientSecret } = readOAuthEnv();
  const audience = getZinniaTokenAudience();

  const start = Date.now();
  logZinniaHttpInfo({
    event: "oauth_token_request_start",
    tokenUrl,
    audience,
    grantType: "client_credentials",
    timeoutMs: TOKEN_REQUEST_TIMEOUT_MS,
  });

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({
        audience,
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    const elapsedMs = Date.now() - start;
    logZinniaHttpError({
      event: "oauth_token_fetch_failed",
      tokenUrl,
      elapsedMs,
      error: serializeErrorCause(cause),
    });
    const message =
      cause instanceof Error ? cause.message : "Token request failed";
    throw new ZinniaAuthError(`Zinnia token request failed: ${message}`, {
      status: 0,
      bodyText: "",
      tokenUrl,
    });
  }

  const elapsedMs = Date.now() - start;
  const bodyText = await response.text();

  if (!response.ok) {
    const snippet = previewResponseBody(bodyText, 4_000);
    logZinniaHttpError({
      event: "oauth_token_http_error",
      tokenUrl,
      httpStatus: response.status,
      statusText: response.statusText,
      elapsedMs,
      responseBody: snippet,
      responseBytes: bodyText.length,
    });
    throw new ZinniaAuthError(
      `Zinnia token endpoint returned ${response.status}`,
      { status: response.status, bodyText: bodyText.slice(0, 4_000), tokenUrl },
    );
  }

  let parsed: OAuthTokenSuccess;
  try {
    parsed = JSON.parse(bodyText) as OAuthTokenSuccess;
  } catch (parseErr) {
    const snippet = previewResponseBody(bodyText, 4_000);
    logZinniaHttpError({
      event: "oauth_token_invalid_json",
      tokenUrl,
      httpStatus: response.status,
      elapsedMs,
      responseBody: snippet,
      parseError: serializeErrorCause(parseErr),
    });
    throw new ZinniaAuthError("Zinnia token response was not valid JSON", {
      status: response.status,
      bodyText: bodyText.slice(0, 4_000),
      tokenUrl,
    });
  }

  if (!parsed.access_token || typeof parsed.access_token !== "string") {
    logZinniaHttpError({
      event: "oauth_token_missing_access_token",
      tokenUrl,
      httpStatus: response.status,
      elapsedMs,
      responseKeys:
        parsed && typeof parsed === "object"
          ? Object.keys(parsed as object)
          : [],
    });
    throw new ZinniaAuthError(
      "Zinnia token response missing access_token",
      { status: response.status, bodyText: bodyText.slice(0, 4_000), tokenUrl },
    );
  }

  const expiresInSeconds =
    typeof parsed.expires_in === "number" && Number.isFinite(parsed.expires_in)
      ? parsed.expires_in
      : 3600;

  logZinniaHttpInfo({
    event: "oauth_token_success",
    tokenUrl,
    elapsedMs,
    expiresInSeconds: Math.max(60, expiresInSeconds),
    tokenChars: parsed.access_token.length,
  });

  return {
    accessToken: parsed.access_token,
    expiresInSeconds: Math.max(60, expiresInSeconds),
  };
}

/**
 * OAuth client credentials against `ZINNIA_TOKEN_URL` (server-only).
 * Token body: `{ audience, grant_type, client_id, client_secret }`.
 * Cached in memory until shortly before `expires_in` — never hardcode tokens.
 */
export async function getZinniaAccessToken(): Promise<string> {
  if (!isZinniaConfigured()) {
    logZinniaHttpError({
      event: "oauth_skipped_not_configured",
      reason: "Zinnia env vars incomplete",
    });
    throw new Error("Zinnia is not configured");
  }

  const now = Date.now();
  const skewMs = EXPIRY_SKEW_SECONDS * 1000;
  if (cache && cache.expiresAtMs - skewMs > now) {
    return cache.accessToken;
  }

  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = (async () => {
    const { accessToken, expiresInSeconds } = await fetchClientCredentialsToken();
    cache = {
      accessToken,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
    };
    return cache.accessToken;
  })().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

/** For tests or after 401 recovery (optional). */
export function clearZinniaTokenCache(): void {
  cache = null;
}
