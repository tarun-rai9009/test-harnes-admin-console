import "server-only";

import { analyzeWithOpenAI } from "@/lib/ai/openai";
import { analyzeWithHeuristics } from "@/lib/ai/heuristics";
import { isAiLayerConfigured } from "@/lib/env";
import type { IntentAnalysisResult, UtteranceContext } from "@/lib/ai/types";

/**
 * Intent + field extraction. Workflow transitions and API calls must not be driven by the LLM —
 * use this result as input to deterministic workflow code only.
 */
export async function analyzeUserUtterance(
  userText: string,
  context?: UtteranceContext,
): Promise<IntentAnalysisResult> {
  const trimmed = userText.trim();
  if (!trimmed) {
    return {
      intent: "unknown",
      extractedFields: {},
      confidence: 1,
    };
  }

  if (context?.expectingFieldKey) {
    if (isAiLayerConfigured()) {
      try {
        return await analyzeWithOpenAI(trimmed, context);
      } catch {
        return {
          intent: "unknown",
          extractedFields: { [context.expectingFieldKey]: trimmed },
          confidence: 0.55,
        };
      }
    }
    return {
      intent: "unknown",
      extractedFields: { [context.expectingFieldKey]: trimmed },
      confidence: 0.6,
    };
  }

  if (isAiLayerConfigured()) {
    try {
      return await analyzeWithOpenAI(trimmed, context);
    } catch {
      const h = analyzeWithHeuristics(trimmed);
      return {
        ...h,
        confidence: Math.min(h.confidence, 0.55),
        naturalPreamble: h.naturalPreamble,
      };
    }
  }

  return analyzeWithHeuristics(trimmed);
}
