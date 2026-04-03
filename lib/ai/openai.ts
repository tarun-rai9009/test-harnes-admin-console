import "server-only";

import { getOpenAiApiKey } from "@/lib/env";
import {
  buildFieldAnswerPrompt,
  INTENT_ANALYSIS_SYSTEM,
} from "@/lib/ai/prompts";
import { sanitizeAnalysis } from "@/lib/ai/sanitize";
import type { IntentAnalysisResult, UtteranceContext } from "@/lib/ai/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;

function getModel(): string {
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

async function callChatCompletionsJson(userContent: string): Promise<unknown> {
  const key = getOpenAiApiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTENT_ANALYSIS_SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

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
