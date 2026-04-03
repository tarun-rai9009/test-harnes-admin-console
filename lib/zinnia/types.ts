/**
 * Zinnia client infrastructure (errors, OAuth parse shape).
 * Domain DTOs live under `types/zinnia/`.
 */

export type ZinniaAuthErrorOptions = {
  status: number;
  bodyText: string;
  /** Resolved token endpoint URL (for server logs only). */
  tokenUrl?: string;
};

export class ZinniaAuthError extends Error {
  readonly status: number;
  readonly bodyText: string;
  readonly tokenUrl?: string;

  constructor(message: string, options: ZinniaAuthErrorOptions) {
    super(message);
    this.name = "ZinniaAuthError";
    this.status = options.status;
    this.bodyText = options.bodyText;
    this.tokenUrl = options.tokenUrl;
  }
}

export type ZinniaApiErrorOptions = {
  status: number;
  bodyText: string;
  path: string;
  method: string;
  /** Full request URL (for server logs only). */
  url?: string;
};

export class ZinniaApiError extends Error {
  readonly status: number;
  readonly bodyText: string;
  readonly path: string;
  readonly method: string;
  readonly url?: string;

  constructor(message: string, options: ZinniaApiErrorOptions) {
    super(message);
    this.name = "ZinniaApiError";
    this.status = options.status;
    this.bodyText = options.bodyText;
    this.path = options.path;
    this.method = options.method;
    this.url = options.url;
  }
}

export type OAuthTokenSuccess = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};
