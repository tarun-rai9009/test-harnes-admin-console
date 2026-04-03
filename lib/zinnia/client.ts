import "server-only";

import { requestZinniaRaw } from "@/lib/zinnia/request";

/**
 * Direct HTTP integration with the Zinnia (carrier ops) backend from this Next.js app only.
 * No separate proxy microservice.
 */

export type ZinniaRequestOptions = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function zinniaFetch(
  options: ZinniaRequestOptions,
): Promise<Response> {
  const path = options.path.startsWith("/")
    ? options.path
    : `/${options.path}`;

  return requestZinniaRaw({
    method: options.method ?? "GET",
    path,
    body: options.body,
  });
}
