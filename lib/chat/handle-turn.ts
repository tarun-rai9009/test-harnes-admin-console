import "server-only";

import { analyzeUserUtterance } from "@/lib/ai/analyze";
import { mapAiIntentToWorkflowId } from "@/lib/ai/intent-map";
import type { ExtractedFields, IntentAnalysisResult } from "@/lib/ai/types";
import {
  getSession,
  updateSession,
  type AssistantSessionState,
} from "@/lib/session/store";
import { buildCreateCarrierCollectingMessage } from "@/lib/workflows/create-carrier-guided";
import { buildFindCarrierCollectingMessage } from "@/lib/workflows/find-carrier-guided";
import {
  findFieldDef,
  formatConfirmationCard,
  formatSuccessResponse,
  getMissingFields,
  mergeExtractedFields,
} from "@/lib/workflows/helpers";
import { getWorkflowDefinition } from "@/lib/workflows/definitions/registry";
import {
  getOptionalFieldKeysInOrder,
  getRequiredFieldDefinitions,
} from "@/lib/workflows/engine";
import {
  getUpdateCarrierNoChangesMessage,
  getUpdateCarrierOptionalIntro,
  updateCarrierHasChanges,
} from "@/lib/workflows/definitions/update-carrier";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import { formatChatWorkflowError } from "@/lib/chat/workflow-errors";
import type {
  ChatApiSuccessBody,
  ChatAssistantApiPayload,
  ChatSummaryCard,
} from "@/types/chat-assistant";
import type { ChatMessage } from "@/types/chat";

function assistantMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
  };
}

function userMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
  };
}

const WORKFLOW_RESET = {
  currentWorkflowId: null as string | null,
  phase: "idle" as const,
  step: 0,
  collectedParams: {} as Record<string, unknown>,
  missingFieldKeys: [] as string[],
  awaitingConfirmation: false,
  pendingFieldKey: null as string | null,
  optionalFieldQueue: [] as string[],
};

function extractedToRecord(fields: ExtractedFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function parseConfirmation(text: string): "yes" | "no" | null {
  const t = text.trim().toLowerCase();
  if (
    /^(yes|y|yeah|yep|sure|ok|okay|confirm|go ahead|proceed|do it|please do)\b/.test(
      t,
    )
  ) {
    return "yes";
  }
  if (/^(no|n|nope|cancel|stop|abort|don't|dont)\b/.test(t)) {
    return "no";
  }
  return null;
}

function wantsReset(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(start over|reset|clear conversation|clear chat)$/.test(t);
}

/** When the model did not classify intent, try a few business phrases. */
function heuristicWorkflowId(text: string): string | null {
  const t = text.toLowerCase();
  if (
    /\b(update|change|edit|modify)\b[\s\S]{0,40}\bcarrier\b/.test(t) ||
    /\bcarrier\b[\s\S]{0,40}\b(update|change)\b/.test(t)
  ) {
    return "update_carrier";
  }
  return null;
}

function composeBody(
  session: AssistantSessionState,
  partial: Partial<ChatAssistantApiPayload> &
    Pick<ChatAssistantApiPayload, "message" | "responseType">,
): ChatApiSuccessBody {
  const def = session.currentWorkflowId
    ? getWorkflowDefinition(session.currentWorkflowId)
    : undefined;
  return {
    message: partial.message,
    responseType: partial.responseType,
    summaryCard: partial.summaryCard,
    resultData: partial.resultData,
    missingFields:
      partial.missingFields !== undefined
        ? partial.missingFields
        : session.missingFieldKeys,
    awaitingConfirmation:
      partial.awaitingConfirmation !== undefined
        ? partial.awaitingConfirmation
        : session.awaitingConfirmation,
    workflowId: session.currentWorkflowId,
    workflowName: def?.userFacingLabel ?? null,
    sessionId: session.sessionId,
    conversationHistory: session.conversationHistory,
  };
}

function buildSuccessSummaryCard(
  def: WorkflowDefinition,
  formatted: ReturnType<typeof formatSuccessResponse>,
): ChatSummaryCard | undefined {
  const title =
    def.id === "create_carrier_draft"
      ? "New carrier summary"
      : def.id === "find_carrier"
        ? "Carrier on file"
        : def.id === "list_carriers"
          ? "Your carrier list"
          : def.id === "get_datapoints"
            ? "Reference values"
            : def.id === "update_carrier"
              ? "Updated details"
              : "Summary";

  if (formatted.summaryFields?.length) {
    return { title, fields: formatted.summaryFields };
  }
  if (formatted.summaryTable?.rows?.length) {
    return { title, table: formatted.summaryTable };
  }
  if (formatted.summaryLines?.length) {
    return { title, lines: formatted.summaryLines };
  }
  return undefined;
}

function resolveConfirmationUi(
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
): { cardText: string; summaryCard: ChatSummaryCard } {
  const cardText = def.buildConfirmationMessage
    ? def.buildConfirmationMessage(merged)
    : formatConfirmationCard(def, merged);
  const rows = def.getConfirmationSummaryRows?.(merged);
  if (rows?.length) {
    return {
      cardText,
      summaryCard: {
        title: "Review before saving",
        fields: rows,
      },
    };
  }
  return {
    cardText,
    summaryCard: {
      title: def.userFacingLabel,
      lines: cardText.split("\n").filter((l) => l.trim().length > 0),
    },
  };
}

function helpMessage(): string {
  return [
    "I’m here to help with day-to-day carrier work. You can ask for things like:",
    "",
    "• Set up a new carrier",
    "• Look someone up by carrier code",
    "• See the full carrier list",
    "• Pull reference values for forms",
    "• Update an existing carrier",
    "",
    "What would you like to do next?",
  ].join("\n");
}

async function executeDefinition(
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): Promise<unknown> {
  const payload = def.buildPayload(data);
  return def.execute(payload);
}

async function runImmediateWorkflow(
  sessionId: string,
  def: WorkflowDefinition,
): Promise<ChatApiSuccessBody> {
  try {
    const result = await executeDefinition(def, {});
    const formatted = formatSuccessResponse(def, result);
    const session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(formatted.message)],
    });
    return composeBody(session, {
      responseType: "success",
      message: formatted.message,
      summaryCard: buildSuccessSummaryCard(def, formatted),
      resultData: undefined,
      missingFields: [],
      awaitingConfirmation: false,
    });
  } catch (e) {
    const msg = formatChatWorkflowError(e, def, undefined);
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      awaitingConfirmation: false,
    });
  }
}

async function runExecuteWithData(
  sessionId: string,
  def: WorkflowDefinition,
  data: Record<string, unknown>,
): Promise<ChatApiSuccessBody> {
  try {
    const result = await executeDefinition(def, data);
    const formatted = formatSuccessResponse(def, result);
    const session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(formatted.message)],
    });
    return composeBody(session, {
      responseType: "success",
      message: formatted.message,
      summaryCard: buildSuccessSummaryCard(def, formatted),
      resultData: undefined,
      missingFields: [],
      awaitingConfirmation: false,
    });
  } catch (e) {
    const msg = formatChatWorkflowError(e, def, data);
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      awaitingConfirmation: false,
    });
  }
}

async function continueAfterMerge(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  analysis: IntentAnalysisResult,
): Promise<ChatApiSuccessBody> {
  const preamble = analysis.naturalPreamble;
  const followUp = analysis.suggestedFollowUp;

  if (def.id === "update_carrier") {
    return continueUpdateCarrierFromMerge(
      sessionId,
      def,
      merged,
      preamble,
      followUp,
    );
  }

  const missing = getMissingFields(def, merged);
  if (missing.length > 0) {
    const pk = missing[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const message =
      def.id === "create_carrier_draft"
        ? buildCreateCarrierCollectingMessage({
            missingCount: missing.length,
            fieldPrompt: field.businessPrompt,
            preamble,
            followUp,
          })
        : def.id === "find_carrier"
          ? buildFindCarrierCollectingMessage({
              fieldPrompt: field.businessPrompt,
              preamble,
              followUp,
            })
          : [preamble, field.businessPrompt, followUp].filter(Boolean).join("\n\n");
    const cur = getSession(sessionId);
    const session = updateSession(sessionId, {
      currentWorkflowId: def.id,
      phase: "collecting",
      collectedParams: merged,
      missingFieldKeys: missing,
      pendingFieldKey: pk,
      awaitingConfirmation: false,
      optionalFieldQueue: [],
      step: cur.step + 1,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message,
      missingFields: missing,
      awaitingConfirmation: false,
    });
  }

  if (!def.requiresConfirmation) {
    return runExecuteWithData(sessionId, def, merged);
  }

  const { cardText, summaryCard } = resolveConfirmationUi(def, merged);
  const cur2 = getSession(sessionId);
  const session = updateSession(sessionId, {
    currentWorkflowId: def.id,
    phase: "confirming",
    collectedParams: merged,
    missingFieldKeys: [],
    pendingFieldKey: null,
    awaitingConfirmation: true,
    optionalFieldQueue: [],
    step: cur2.step + 1,
    appendToHistory: [assistantMessage(cardText)],
  });
  return composeBody(session, {
    responseType: "confirm",
    message: cardText,
    summaryCard,
    missingFields: [],
    awaitingConfirmation: true,
  });
}

function continueUpdateCarrierFromMerge(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  preamble?: string,
  followUp?: string,
): ChatApiSuccessBody {
  const missing = getMissingFields(def, merged);
  if (missing.length > 0) {
    const pk = missing[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const bridge =
      pk === "carrierCode"
        ? "I’ll update the details for you — first I need to know which carrier we’re working with."
        : undefined;
    const message = [preamble, bridge, field.businessPrompt, followUp]
      .filter(Boolean)
      .join("\n\n");
    const session = updateSession(sessionId, {
      currentWorkflowId: def.id,
      phase: "collecting",
      collectedParams: merged,
      missingFieldKeys: missing,
      pendingFieldKey: pk,
      awaitingConfirmation: false,
      optionalFieldQueue: [],
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message,
      missingFields: missing,
      awaitingConfirmation: false,
    });
  }

  const queue = getOptionalFieldKeysInOrder(def, merged);
  const pk = queue[0] ?? null;
  if (!pk) {
    const msg = "This update flow needs optional fields configured.";
    const session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(session, {
      responseType: "error",
      message: msg,
      awaitingConfirmation: false,
    });
  }
  const field = findFieldDef(def, pk, merged)!;
  const optionalIntro = getUpdateCarrierOptionalIntro(merged);
  const message = [preamble, optionalIntro, field.businessPrompt, followUp]
    .filter(Boolean)
    .join("\n\n");
  const session = updateSession(sessionId, {
    currentWorkflowId: def.id,
    phase: "collecting",
    collectedParams: merged,
    missingFieldKeys: [],
    pendingFieldKey: pk,
    awaitingConfirmation: false,
    optionalFieldQueue: queue,
    appendToHistory: [assistantMessage(message)],
  });
  return composeBody(session, {
    responseType: "needs_input",
    message,
    missingFields: [],
    awaitingConfirmation: false,
  });
}

function handleUpdateCarrierCollecting(
  sessionId: string,
  def: WorkflowDefinition,
  session: AssistantSessionState,
  merged: Record<string, unknown>,
  rejected: { key: string; error: string }[],
  analysis: IntentAnalysisResult,
): ChatApiSuccessBody {
  let queue = [...session.optionalFieldQueue];
  const pending = session.pendingFieldKey;
  const headRejected =
    pending && rejected.some((r) => r.key === pending);

  if (pending && queue[0] === pending && !headRejected) {
    queue = queue.slice(1);
  }

  const missingReq = getMissingFields(def, merged);
  if (missingReq.length > 0) {
    const pk = missingReq[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const err = rejected.find((r) => r.key === pk);
    const message = [
      analysis.naturalPreamble,
      err?.error,
      field.businessPrompt,
    ]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      missingFieldKeys: missingReq,
      pendingFieldKey: pk,
      optionalFieldQueue: queue,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: err ? "error" : "needs_input",
      message,
      missingFields: missingReq,
      awaitingConfirmation: false,
    });
  }

  if (queue.length > 0) {
    const pk = queue[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const err = headRejected ? rejected.find((r) => r.key === pending) : undefined;
    const message = [
      analysis.naturalPreamble,
      err?.error,
      field.businessPrompt,
      analysis.suggestedFollowUp,
    ]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      missingFieldKeys: [],
      pendingFieldKey: pk,
      optionalFieldQueue: queue,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: err ? "error" : "needs_input",
      message,
      missingFields: [],
      awaitingConfirmation: false,
    });
  }

  if (!updateCarrierHasChanges(merged)) {
    const fullQueue = getOptionalFieldKeysInOrder(def, merged);
    const pk = fullQueue[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const message = [
      getUpdateCarrierNoChangesMessage(),
      field.businessPrompt,
    ].join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      pendingFieldKey: pk,
      optionalFieldQueue: fullQueue,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message,
      missingFields: [],
      awaitingConfirmation: false,
    });
  }

  const { cardText, summaryCard } = resolveConfirmationUi(def, merged);
  const s2 = updateSession(sessionId, {
    phase: "confirming",
    collectedParams: merged,
    pendingFieldKey: null,
    awaitingConfirmation: true,
    optionalFieldQueue: [],
    appendToHistory: [assistantMessage(cardText)],
  });
  return composeBody(s2, {
    responseType: "confirm",
    message: cardText,
    summaryCard,
    awaitingConfirmation: true,
  });
}

async function handleIdleTurn(
  sessionId: string,
  text: string,
): Promise<ChatApiSuccessBody> {
  const analysis = await analyzeUserUtterance(text);
  const workflowId =
    mapAiIntentToWorkflowId(analysis.intent) ?? heuristicWorkflowId(text);
  if (!workflowId) {
    const session = updateSession(sessionId, {
      appendToHistory: [assistantMessage(helpMessage())],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: helpMessage(),
      awaitingConfirmation: false,
    });
  }

  const def = getWorkflowDefinition(workflowId);
  if (!def) {
    const session = updateSession(sessionId, {
      appendToHistory: [assistantMessage(helpMessage())],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: helpMessage(),
      awaitingConfirmation: false,
    });
  }

  if (workflowId === "list_carriers" || workflowId === "get_datapoints") {
    return runImmediateWorkflow(sessionId, def);
  }

  const { merged, rejected } = mergeExtractedFields(
    def,
    {},
    extractedToRecord(analysis.extractedFields),
  );
  if (
    rejected.length > 0 &&
    getRequiredFieldDefinitions(def, merged).some((f) =>
      rejected.some((r) => r.key === f.key),
    )
  ) {
    const first = rejected[0]!;
    const miss = getMissingFields(def, merged);
    const nextField = findFieldDef(def, miss[0] ?? first.key, merged);
    const message =
      def.id === "create_carrier_draft" && nextField
        ? buildCreateCarrierCollectingMessage({
            missingCount: miss.length,
            fieldPrompt: nextField.businessPrompt,
            preamble: [analysis.naturalPreamble, first.error].filter(Boolean).join("\n\n"),
          })
        : def.id === "find_carrier" && nextField
          ? buildFindCarrierCollectingMessage({
              fieldPrompt: nextField.businessPrompt,
              preamble: [analysis.naturalPreamble, first.error].filter(Boolean).join("\n\n"),
            })
          : [
              analysis.naturalPreamble,
              first.error,
              nextField?.businessPrompt,
            ]
              .filter(Boolean)
              .join("\n\n");
    const s3 = updateSession(sessionId, {
      currentWorkflowId: def.id,
      phase: "collecting",
      collectedParams: merged,
      missingFieldKeys: miss,
      pendingFieldKey: miss[0] ?? null,
      optionalFieldQueue: [],
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s3, {
      responseType: "needs_input",
      message,
      missingFields: s3.missingFieldKeys,
      awaitingConfirmation: false,
    });
  }

  return await continueAfterMerge(sessionId, def, merged, analysis);
}

async function handleCollectingTurn(
  sessionId: string,
  text: string,
  session: AssistantSessionState,
): Promise<ChatApiSuccessBody> {
  const def = getWorkflowDefinition(session.currentWorkflowId!);
  if (!def) {
    const s2 = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(helpMessage())],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: helpMessage(),
      awaitingConfirmation: false,
    });
  }

  const analysis = await analyzeUserUtterance(text, {
    expectingFieldKey: session.pendingFieldKey ?? undefined,
    expectingWorkflowId: session.currentWorkflowId ?? undefined,
  });

  const { merged, rejected } = mergeExtractedFields(
    def,
    session.collectedParams,
    extractedToRecord(analysis.extractedFields),
  );

  if (def.id === "update_carrier") {
    return handleUpdateCarrierCollecting(
      sessionId,
      def,
      session,
      merged,
      rejected,
      analysis,
    );
  }

  const pending = session.pendingFieldKey;
  const pendingReject =
    pending !== null ? rejected.find((r) => r.key === pending) : undefined;
  if (pendingReject && pending !== null) {
    const field = findFieldDef(def, pending, merged)!;
    const missAfter = getMissingFields(def, merged);
    const message =
      def.id === "create_carrier_draft"
        ? buildCreateCarrierCollectingMessage({
            missingCount: missAfter.length,
            fieldPrompt: field.businessPrompt,
            preamble: [analysis.naturalPreamble, pendingReject.error]
              .filter(Boolean)
              .join("\n\n"),
          })
        : def.id === "find_carrier"
          ? buildFindCarrierCollectingMessage({
              fieldPrompt: field.businessPrompt,
              preamble: [analysis.naturalPreamble, pendingReject.error]
                .filter(Boolean)
                .join("\n\n"),
            })
          : [pendingReject.error, field.businessPrompt].filter(Boolean).join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      missingFieldKeys: getMissingFields(def, merged),
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message,
      missingFields: s2.missingFieldKeys,
      awaitingConfirmation: false,
    });
  }

  return await continueAfterMerge(sessionId, def, merged, analysis);
}

async function handleConfirmTurn(
  sessionId: string,
  text: string,
  session: AssistantSessionState,
): Promise<ChatApiSuccessBody> {
  const decision = parseConfirmation(text);
  if (decision === "no") {
    const s2 = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [
        assistantMessage(
          "No problem — we’ve stopped that. What would you like to do instead?",
        ),
      ],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message:
        "No problem — we’ve stopped that. What would you like to do instead?",
      awaitingConfirmation: false,
    });
  }
  if (decision !== "yes") {
    const msg =
      "Please reply yes to continue, or no to cancel.";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: msg,
      awaitingConfirmation: true,
    });
  }

  const def = getWorkflowDefinition(session.currentWorkflowId!);
  if (!def) {
    const s2 = updateSession(sessionId, { ...WORKFLOW_RESET });
    return composeBody(s2, {
      responseType: "error",
      message: "Something went sideways on our end. Let’s start fresh — what would you like to do?",
      awaitingConfirmation: false,
    });
  }

  try {
    const result = await executeDefinition(def, session.collectedParams);
    const formatted = formatSuccessResponse(def, result);
    const s2 = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(formatted.message)],
    });
    return composeBody(s2, {
      responseType: "success",
      message: formatted.message,
      summaryCard: buildSuccessSummaryCard(def, formatted),
      resultData: undefined,
      missingFields: [],
      awaitingConfirmation: false,
    });
  } catch (e) {
    const msg = formatChatWorkflowError(e, def, session.collectedParams);
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      awaitingConfirmation: session.awaitingConfirmation,
    });
  }
}

export async function handleChatTurn(input: {
  sessionId: string;
  message: string;
}): Promise<ChatApiSuccessBody> {
  const sessionId = input.sessionId.trim();
  const text = input.message.trim();
  let session = getSession(sessionId);

  if (session.conversationHistory.length === 0 && !text) {
    const greeting = [
      "Hello — I’m your carrier operations assistant.",
      "",
      "Tell me what you’re trying to do in plain language, or choose a quick action below. I’ll guide you step by step.",
    ].join("\n");
    session = updateSession(sessionId, {
      appendToHistory: [assistantMessage(greeting)],
    });
    return composeBody(session, {
      responseType: "greeting",
      message: greeting,
      summaryCard: {
        lines: [
          "Set up a new carrier",
          "Look up a carrier by code",
          "View the carrier list",
          "Open the reference list",
          "Update carrier information",
        ],
      },
      awaitingConfirmation: false,
    });
  }

  if (!text) {
    const msg =
      "Go ahead and type what you need, or pick up where we left off.";
    session = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: msg,
      awaitingConfirmation: false,
    });
  }

  session = updateSession(sessionId, {
    appendToHistory: [userMessage(text)],
  });

  if (wantsReset(text)) {
    session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [
        assistantMessage(
          "Starting fresh. What would you like to work on next?",
        ),
      ],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: "Starting fresh. What would you like to work on next?",
      awaitingConfirmation: false,
    });
  }

  if (session.awaitingConfirmation && session.currentWorkflowId) {
    return handleConfirmTurn(sessionId, text, session);
  }

  if (
    session.currentWorkflowId &&
    session.phase === "collecting"
  ) {
    return handleCollectingTurn(sessionId, text, session);
  }

  return handleIdleTurn(sessionId, text);
}
