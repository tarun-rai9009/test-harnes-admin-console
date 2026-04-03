import "server-only";

import { getZinniaBaseUrl, isZinniaConfigured } from "@/lib/env";
import { getZinniaAccessToken } from "@/lib/zinnia/auth";
import {
  logZinniaHttpError,
  logZinniaHttpInfo,
  previewRequestBody,
  previewResponseBody,
  serializeErrorCause,
} from "@/lib/zinnia/server-log";
import { ZinniaApiError } from "@/lib/zinnia/types";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

function joinBaseAndPath(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

type ZinniaMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ZinniaJsonRequestOptions = {
  method: ZinniaMethod;
  /** Path relative to ZINNIA_BASE_URL, e.g. `/carriers` */
  path: string;
  body?: unknown;
  timeoutMs?: number;
};

async function performZinniaFetch(
  options: ZinniaJsonRequestOptions,
  url: string,
  token: string,
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const bodySerialized =
    options.body !== undefined ? JSON.stringify(options.body) : undefined;

  const start = Date.now();
  logZinniaHttpInfo({
    event: "api_request_start",
    method: options.method,
    path: options.path,
    url,
    timeoutMs,
    hasBody: bodySerialized !== undefined,
    bodyPreview: previewRequestBody(options.body),
  });

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: bodySerialized,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsedMs = Date.now() - start;
    logZinniaHttpInfo({
      event: "api_response_received",
      method: options.method,
      path: options.path,
      url,
      httpStatus: response.status,
      ok: response.ok,
      elapsedMs,
    });
    return response;
  } catch (cause) {
    const elapsedMs = Date.now() - start;
    logZinniaHttpError({
      event: "api_fetch_failed",
      method: options.method,
      path: options.path,
      url,
      elapsedMs,
      error: serializeErrorCause(cause),
    });
    const message = cause instanceof Error ? cause.message : "Request failed";
    throw new ZinniaApiError(`Zinnia request failed: ${message}`, {
      status: 0,
      bodyText: "",
      path: options.path,
      method: options.method,
      url,
    });
  }
}

/**
 * Authenticated JSON request to `ZINNIA_BASE_URL` (server-side only).
 * Headers include Bearer authorization, JSON content type, and Accept wildcard.
 */
export async function requestZinniaJson<T = unknown>(
  options: ZinniaJsonRequestOptions,
): Promise<T> {
  if (!isZinniaConfigured()) {
    logZinniaHttpError({
      event: "api_skipped_not_configured",
      method: options.method,
      path: options.path,
      reason: "Zinnia env vars incomplete (see isZinniaConfigured)",
    });
    throw new Error("Zinnia is not configured");
  }

  const baseUrl = getZinniaBaseUrl();
  if (!baseUrl) {
    logZinniaHttpError({
      event: "api_skipped_no_base_url",
      method: options.method,
      path: options.path,
    });
    throw new Error("ZINNIA_BASE_URL is not set");
  }

  const url = joinBaseAndPath(baseUrl, options.path);
  const token = await getZinniaAccessToken();

  const response = await performZinniaFetch(options, url, token);
  const bodyText = await response.text();

  if (!response.ok) {
    const snippet = previewResponseBody(bodyText);
    logZinniaHttpError({
      event: "api_http_error",
      method: options.method,
      path: options.path,
      url,
      httpStatus: response.status,
      statusText: response.statusText,
      responseBody: snippet,
      responseBytes: bodyText.length,
    });
    throw new ZinniaApiError(
      `Zinnia API error ${response.status} ${options.method} ${options.path}`,
      {
        status: response.status,
        bodyText: bodyText.slice(0, 8_000),
        path: options.path,
        method: options.method,
        url,
      },
    );
  }

  if (!bodyText.length) {
    logZinniaHttpInfo({
      event: "api_success_empty_body",
      method: options.method,
      path: options.path,
      url,
    });
    return undefined as T;
  }

  try {
    const parsed = JSON.parse(bodyText) as T;
    logZinniaHttpInfo({
      event: "api_success_json",
      method: options.method,
      path: options.path,
      url,
      responseBytes: bodyText.length,
    });
    return parsed;
  } catch (parseErr) {
    const snippet = previewResponseBody(bodyText);
    logZinniaHttpError({
      event: "api_invalid_json",
      method: options.method,
      path: options.path,
      url,
      httpStatus: response.status,
      responseBody: snippet,
      parseError: serializeErrorCause(parseErr),
    });
    throw new ZinniaApiError("Zinnia response was not valid JSON", {
      status: response.status,
      bodyText: bodyText.slice(0, 8_000),
      path: options.path,
      method: options.method,
      url,
    });
  }
}

/**
 * Lower-level: same as JSON helper but returns the raw `Response` (e.g. for streaming).
 */
export async function requestZinniaRaw(
  options: ZinniaJsonRequestOptions,
): Promise<Response> {
  if (!isZinniaConfigured()) {
    logZinniaHttpError({
      event: "api_skipped_not_configured",
      method: options.method,
      path: options.path,
      reason: "Zinnia env vars incomplete",
    });
    throw new Error("Zinnia is not configured");
  }

  const baseUrl = getZinniaBaseUrl();
  if (!baseUrl) {
    logZinniaHttpError({
      event: "api_skipped_no_base_url",
      method: options.method,
      path: options.path,
    });
    throw new Error("ZINNIA_BASE_URL is not set");
  }

  const url = joinBaseAndPath(baseUrl, options.path);
  const token = await getZinniaAccessToken();
  const response = await performZinniaFetch(options, url, token);

  if (!response.ok) {
    const bodyText = await response.text();
    const snippet = previewResponseBody(bodyText);
    logZinniaHttpError({
      event: "api_http_error_raw",
      method: options.method,
      path: options.path,
      url,
      httpStatus: response.status,
      statusText: response.statusText,
      responseBody: snippet,
      responseBytes: bodyText.length,
    });
    throw new ZinniaApiError(
      `Zinnia API error ${response.status} ${options.method} ${options.path}`,
      {
        status: response.status,
        bodyText: bodyText.slice(0, 8_000),
        path: options.path,
        method: options.method,
        url,
      },
    );
  }

  return response;
}
