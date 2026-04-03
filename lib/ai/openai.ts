import "server-only";

import { resolveAzureOpenAiDeploymentName } from "@/lib/ai/azure-deployment";
import {
  getAzureOpenAiApiKey,
  getAzureOpenAiApiVersion,
  getAzureOpenAiEndpoint,
  getOpenAiApiKey,
  usesAzureOpenAi,
} from "@/lib/env";
import {
  buildFieldAnswerPrompt,
  INTENT_ANALYSIS_SYSTEM,
} from "@/lib/ai/prompts";
import { sanitizeAnalysis } from "@/lib/ai/sanitize";
import type { IntentAnalysisResult, UtteranceContext } from "@/lib/ai/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;

function getOpenAiComModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

type ChatBody = {
  temperature: number;
  max_tokens: number;
  response_format: { type: "json_object" };
  messages: { role: string; content: string }[];
  model?: string;
};

function buildChatBody(userContent: string): ChatBody {
  const base: ChatBody = {
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: INTENT_ANALYSIS_SYSTEM },
      { role: "user", content: userContent },
    ],
  };
  if (!usesAzureOpenAi()) {
    base.model = getOpenAiComModel();
  }
  return base;
}

async function resolveChatUrl(): Promise<{
  url: string;
  headers: Record<string, string>;
}> {
  if (usesAzureOpenAi()) {
    const endpoint = getAzureOpenAiEndpoint();
    const key = getAzureOpenAiApiKey();
    const apiVersion = getAzureOpenAiApiVersion();
    if (!endpoint || !key) {
      throw new Error(
        "Azure OpenAI: set AZURE_OPENAI_ENDPOINT and an API key (AZURE_OPENAI_API_KEY or OPENAI_API_KEY)",
      );
    }
    const deployment = await resolveAzureOpenAiDeploymentName(endpoint, key);
    const dep = encodeURIComponent(deployment);
    const ver = encodeURIComponent(apiVersion);
    const url = `${endpoint}/openai/deployments/${dep}/chat/completions?api-version=${ver}`;
    return {
      url,
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
      },
    };
  }

  const key = getOpenAiApiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return {
    url: OPENAI_URL,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

async function callChatCompletionsJson(userContent: string): Promise<unknown> {
  const { url, headers } = await resolveChatUrl();

  const logLlm =
    process.env.NODE_ENV === "development" || process.env.LLM_DEBUG === "1";
  if (logLlm) {
    let host = "unknown";
    try {
      host = new URL(url).host;
    } catch {
      /* ignore */
    }
    console.info("[llm]", {
      event: "calling_chat_completions",
      provider: usesAzureOpenAi() ? "azure_openai" : "openai_com",
      host,
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(buildChatBody(userContent)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (logLlm && response.ok) {
    console.info("[llm]", {
      event: "chat_completions_http_ok",
      provider: usesAzureOpenAi() ? "azure_openai" : "openai_com",
      status: response.status,
    });
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenAI HTTP ${response.status}: ${text.slice(0, 400)}`,
    );
  }

  let parsed: {
    choices?: { message?: { content?: string } }[];
  };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    throw new Error("OpenAI response was not JSON");
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI missing message content");
  }

  return extractJsonObject(content);
}

export async function analyzeWithOpenAI(
  userText: string,
  context?: UtteranceContext,
): Promise<IntentAnalysisResult> {
  if (context?.expectingFieldKey) {
    const fieldKey = context.expectingFieldKey;
    const userContent = buildFieldAnswerPrompt(
      fieldKey,
      context.expectingWorkflowId,
      userText,
    );
    const raw = await callChatCompletionsJson(userContent);
    const sanitized = sanitizeAnalysis(raw);
    const direct = sanitized.extractedFields[fieldKey as keyof typeof sanitized.extractedFields];
    if (direct !== undefined) {
      return {
        ...sanitized,
        intent: "unknown",
        extractedFields: { [fieldKey]: direct },
      };
    }
    const firstVal = Object.values(sanitized.extractedFields)[0];
    if (firstVal !== undefined) {
      return {
        intent: "unknown",
        extractedFields: { [fieldKey]: firstVal },
        confidence: sanitized.confidence,
        naturalPreamble: sanitized.naturalPreamble,
        suggestedFollowUp: sanitized.suggestedFollowUp,
      };
    }
    return {
      intent: "unknown",
      extractedFields: { [fieldKey]: userText.trim() },
      confidence: Math.min(0.55, sanitized.confidence || 0.5),
      naturalPreamble: sanitized.naturalPreamble,
    };
  }

  const raw = await callChatCompletionsJson(userText.trim());
  return sanitizeAnalysis(raw);
}
