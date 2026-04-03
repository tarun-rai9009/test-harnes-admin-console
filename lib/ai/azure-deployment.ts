import "server-only";

import { getAzureOpenAiDeployment } from "@/lib/env";

const DEFAULT_DEPLOYMENT_GUESS = "gpt-4o-mini";
const LIST_TIMEOUT_MS = 15_000;

let resolvedCache: string | undefined;

function pickDeploymentId(
  items: { id?: string; model?: string }[],
): string | undefined {
  const withId = items.filter(
    (x): x is { id: string; model?: string } =>
      typeof x.id === "string" && x.id.length > 0,
  );
  if (withId.length === 0) return undefined;
  if (withId.length === 1) return withId[0]!.id;

  const exact = withId.find((x) => x.id === DEFAULT_DEPLOYMENT_GUESS);
  if (exact) return exact.id;

  const o = withId.find((x) => /gpt-4o/i.test(x.id));
  if (o) return o.id;

  const gpt = withId.find(
    (x) => /^gpt/i.test(x.id) || /^gpt/i.test(x.model ?? ""),
  );
  if (gpt) return gpt.id;

  return withId[0]!.id;
}

function fallbackDeployment(reason: string): string {
  console.warn(
    `[azure-openai] ${reason} Using deployment name "${DEFAULT_DEPLOYMENT_GUESS}". Set AZURE_OPENAI_DEPLOYMENT (or OPENAI_MODEL) to your Azure deployment name if requests fail.`,
  );
  resolvedCache = DEFAULT_DEPLOYMENT_GUESS;
  return resolvedCache;
}

/**
 * Resolves the Azure chat deployment id: env first, then GET /openai/deployments, then a default guess.
 */
export async function resolveAzureOpenAiDeploymentName(
  endpoint: string,
  apiKey: string,
): Promise<string> {
  if (resolvedCache) return resolvedCache;

  const explicit = getAzureOpenAiDeployment();
  if (explicit) {
    resolvedCache = explicit;
    return resolvedCache;
  }

  const listVersion =
    process.env.AZURE_OPENAI_DEPLOYMENTS_LIST_API_VERSION?.trim() ||
    "2023-05-15";
  const url = `${endpoint}/openai/deployments?api-version=${encodeURIComponent(listVersion)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "api-key": apiKey },
      signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      return fallbackDeployment(
        `Could not list deployments (HTTP ${res.status}): ${text.slice(0, 120)}.`,
      );
    }

    let json: { data?: { id?: string; model?: string }[] };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      return fallbackDeployment("Deployments response was not JSON.");
    }

    const data = json.data ?? [];
    const chosen = pickDeploymentId(data);
    if (!chosen) {
      return fallbackDeployment("No deployments returned from Azure.");
    }

    resolvedCache = chosen;
    console.info(
      `[azure-openai] Using deployment "${chosen}" (auto-selected). Set AZURE_OPENAI_DEPLOYMENT to override.`,
    );
    return resolvedCache;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fallbackDeployment(`List deployments failed (${msg}).`);
  }
}
