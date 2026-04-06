import "server-only";

import { CHAT_AGENT_TITLE } from "@/lib/branding";
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
import { buildCreateDraftPayload } from "@/lib/workflows/create-carrier-draft-form-utils";
import {
  buildCreateCarrierDraftFormState,
  mergeCreateCarrierDraftFormIntoCollected,
} from "@/lib/workflows/definitions/create-carrier-draft";
import { validateCreateCarrierDraftMerged } from "@/lib/workflows/create-carrier-draft-validate";
import { getWorkflowDefinition } from "@/lib/workflows/definitions/registry";
import { createCarrierDraft } from "@/lib/zinnia/carriers";
import { parseZinniaCreateDraftErrorBody } from "@/lib/zinnia/parse-create-draft-errors";
import { parseZinniaUpdateCarrierErrorBody } from "@/lib/zinnia/parse-update-carrier-errors";
import { ZinniaApiError } from "@/lib/zinnia/types";
import {
  getOptionalFieldKeysInOrder,
  getRequiredFieldDefinitions,
} from "@/lib/workflows/engine";
import { updateCarrierHasChanges } from "@/lib/workflows/definitions/update-carrier";
import {
  UPDATE_CATEGORY_LABELS,
  type UpdateCategoryId,
} from "@/lib/workflows/definitions/update-carrier-constants";
import {
  getUpdateCarrierNoChangesMessage,
  getUpdateCarrierOptionalIntro,
  validateUpdateCategory,
} from "@/lib/workflows/definitions/update-carrier-catalog";
import {
  buildUpdateCarrierSectionFormFields,
  buildUpdateSectionFormStateFromStrings,
  isUpdateCategoryId,
  listUpdateCarrierCategories,
  sliceUpdateSectionValuesFromFlat,
  stringValuesForUpdateSection,
  validateAndMergeUpdateCarrierSection,
} from "@/lib/workflows/update-carrier-section-form";
import { validateCarrierCode } from "@/lib/workflows/validators";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-types";
import {
  buildUpdateSuccessSummaryCardFields,
  stripMultiCategoryKeysFromCollected,
  stripUpdateCategoryKeysFromCollected,
} from "@/lib/workflows/definitions/update-carrier-payload";
import { validateCollectedParamsBeforeExecute } from "@/lib/workflows/validate-collected";
import { formatChatWorkflowError } from "@/lib/chat/workflow-errors";
import type {
  ChatApiSuccessBody,
  ChatAssistantApiPayload,
  ChatSummaryCard,
  UpdateCarrierFlowPayload,
  UpdateCarrierSectionFormState,
} from "@/types/chat-assistant";
import type { ChatMessage } from "@/types/chat";
import type { CarrierDetails } from "@/types/zinnia/carriers";

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
  createCarrierSkipOptionalWalkthrough: false,
  createCarrierFormFirst: false,
  updateCarrierUiPhase: "none" as const,
};

const MAIN_MENU_ACTIONS: { label: string; message: string }[] = [
  { label: "Create new carrier", message: "New carrier" },
  { label: "Lookup Carrier by carrierCode", message: "Lookup by code" },
  { label: "Check all carriers", message: "List carriers" },
  { label: "Update the carrier", message: "Update carrier" },
];

function wantsMainMenu(text: string): boolean {
  return /^next$/i.test(text.trim());
}

function buildMainMenuAssistantReply(): {
  message: string;
  summaryCard: ChatSummaryCard;
} {
  return {
    message: "",
    summaryCard: { actions: MAIN_MENU_ACTIONS },
  };
}

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
  const t = text.toLowerCase().trim();
  if (
    /\b(update|change|edit|modify)\b[\s\S]{0,40}\bcarrier\b/.test(t) ||
    /\bcarrier\b[\s\S]{0,40}\b(update|change)\b/.test(t)
  ) {
    return "update_carrier";
  }
  if (
    /^new\s+carrier$/i.test(text.trim()) ||
    /\bnew\s+carrier\b/.test(t) ||
    /\bcreate\s+(?:a\s+)?(?:new\s+)?carrier\b/.test(t) ||
    /\bcarrier\s+draft\b/.test(t) ||
    /\bcreate\s+carrier\s+draft\b/.test(t)
  ) {
    return "create_carrier_draft";
  }
  if (
    /\b(list|check|show|get)\s+(?:all\s+)?carriers?\b/.test(t) ||
    /\ball\s+carriers\b/.test(t)
  ) {
    return "list_carriers";
  }
  if (/\blookup\b/.test(t) && /\b(code|carrier)\b/.test(t)) {
    return "find_carrier";
  }
  return null;
}

/** True if the user message contains a 4-char carrier code token (A–Z / 0–9). */
function hasCarrierCodeTokenInMessage(text: string): boolean {
  return /\b[A-Z0-9]{4}\b/.test(text.trim().toUpperCase());
}

/** e.g. "Update carrier AB12" from Add detail after create — code only after the phrase. */
function carrierCodeFromUpdateCarrierPhrase(text: string): string | null {
  const m = text.trim().match(/^update\s+carrier\s+([A-Za-z0-9]{4})\b/i);
  return m ? m[1]!.toUpperCase() : null;
}

type ComposeBodyPartial = Partial<ChatAssistantApiPayload> &
  Pick<ChatAssistantApiPayload, "message" | "responseType"> & {
    /** After WORKFLOW_RESET, keep UI chip / captions (e.g. create success + full result). */
    displayWorkflowId?: string | null;
    displayWorkflowName?: string | null;
    /**
     * When set, overrides auto `updateCarrierFlow` from session (use `null` to omit panel).
     */
    updateCarrierFlow?: UpdateCarrierFlowPayload | null;
  };

function buildUpdateSectionFormState(
  collected: Record<string, unknown>,
  categoryId: UpdateCategoryId,
  errors: Record<string, string> = {},
  formLevelError?: string,
): UpdateCarrierSectionFormState {
  return {
    fields: buildUpdateCarrierSectionFormFields(categoryId),
    values: stringValuesForUpdateSection(collected, categoryId),
    errors,
    formLevelError,
  };
}

function buildUpdateCarrierFlowPayloadFromSession(
  session: AssistantSessionState,
): UpdateCarrierFlowPayload | null {
  if (session.currentWorkflowId !== "update_carrier") return null;
  const phase = session.updateCarrierUiPhase ?? "none";
  if (phase === "none") return null;

  const data = session.collectedParams;
  const code =
    typeof data.carrierCode === "string" ? data.carrierCode.toUpperCase() : "";

  if (phase === "need_code") {
    return { step: "need_code" };
  }

  if (phase === "pick_category") {
    return {
      step: "pick_category",
      carrierCode: code,
      categories: listUpdateCarrierCategories(),
      multiSelect: true,
    };
  }

  if (phase === "multi_section_form") {
    const raw = data.selectedUpdateCategories;
    const cats = Array.isArray(raw)
      ? raw.filter(
          (c): c is UpdateCategoryId =>
            typeof c === "string" && isUpdateCategoryId(c),
        )
      : [];
    if (!cats.length) {
      return {
        step: "pick_category",
        carrierCode: code,
        categories: listUpdateCarrierCategories(),
        multiSelect: true,
      };
    }
    return {
      step: "multi_section_form",
      carrierCode: code,
      categoryForms: cats.map((id) => ({
        categoryId: id,
        categoryLabel: UPDATE_CATEGORY_LABELS[id],
        form: buildUpdateSectionFormState(data, id),
      })),
    };
  }

  if (phase === "section_confirm") {
    return null;
  }

  const cat = data.updateCategory;
  if (typeof cat !== "string" || !isUpdateCategoryId(cat)) {
    return {
      step: "pick_category",
      carrierCode: code,
      categories: listUpdateCarrierCategories(),
      multiSelect: true,
    };
  }

  return {
    step: "section_form",
    carrierCode: code,
    categoryId: cat,
    categoryLabel: UPDATE_CATEGORY_LABELS[cat],
    form: buildUpdateSectionFormState(data, cat),
  };
}

function composeBody(
  session: AssistantSessionState,
  partial: ComposeBodyPartial,
): ChatApiSuccessBody {
  const workflowId =
    partial.displayWorkflowId !== undefined
      ? partial.displayWorkflowId
      : session.currentWorkflowId;
  const def = workflowId ? getWorkflowDefinition(workflowId) : undefined;
  const workflowName =
    partial.displayWorkflowName !== undefined
      ? partial.displayWorkflowName
      : (def?.userFacingLabel ?? null);
  const updateCarrierFlow =
    partial.updateCarrierFlow !== undefined
      ? partial.updateCarrierFlow
      : buildUpdateCarrierFlowPayloadFromSession(session);

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
    workflowId,
    workflowName,
    createCarrierDraftForm:
      partial.createCarrierDraftForm !== undefined
        ? partial.createCarrierDraftForm
        : undefined,
    updateCarrierFlow,
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
      ? "Draft"
      : def.id === "find_carrier"
        ? "Carrier"
        : def.id === "list_carriers"
          ? "Carriers"
          : def.id === "get_datapoints"
            ? "Reference"
            : def.id === "update_carrier"
              ? "Updated"
              : "Summary";

  if (formatted.summaryFields?.length) {
    return { title, fields: formatted.summaryFields, actions: formatted.actions };
  }
  if (formatted.summaryTable?.rows?.length) {
    return { title, table: formatted.summaryTable, actions: formatted.actions };
  }
  if (formatted.summaryLines?.length) {
    return { title, lines: formatted.summaryLines, actions: formatted.actions };
  }
  if (formatted.actions?.length) {
    return { title, actions: formatted.actions };
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
        title: "Review",
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
    "Try:",
    "• New carrier",
    "• Lookup by code",
    "• List carriers",
    "• Update carrier",
    "",
    "What do you need?",
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
      resultData: def.id === "find_carrier" ? result : undefined,
      missingFields: [],
      awaitingConfirmation: false,
      /** Session uses WORKFLOW_RESET so currentWorkflowId is null; UI still needs chip + StructuredPanel find_carrier branch. */
      ...(def.id === "find_carrier"
        ? {
            displayWorkflowId: def.id,
            displayWorkflowName: def.userFacingLabel,
          }
        : {}),
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

const CREATE_DRAFT_FORM_FAIL_COPY =
  "Fix the highlighted fields, then submit again.";

function rejectedToErrorMap(
  rejected: { key: string; error: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const r of rejected) errors[r.key] = r.error;
  return errors;
}

/** New carrier: show the full form immediately (required + optional), not chat Q&A. */
function startCreateCarrierWithForm(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  analysis: IntentAnalysisResult,
  rejected: { key: string; error: string }[],
): ChatApiSuccessBody {
  const preamble = analysis.naturalPreamble;
  const followUp = analysis.suggestedFollowUp;
  const errors = rejectedToErrorMap(rejected);
  const message = [
    preamble,
    "Use the form below. Required fields must be filled. Submit to create the draft.",
    followUp,
  ]
    .filter(Boolean)
    .join("\n\n");
  const cur = getSession(sessionId);
  const session = updateSession(sessionId, {
    currentWorkflowId: def.id,
    phase: "collecting",
    collectedParams: merged,
    missingFieldKeys: [],
    pendingFieldKey: null,
    optionalFieldQueue: [],
    createCarrierSkipOptionalWalkthrough: true,
    createCarrierFormFirst: true,
    step: cur.step + 1,
    appendToHistory: [assistantMessage(message)],
  });
  return composeBody(session, {
    responseType: "needs_input",
    message,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: buildCreateCarrierDraftFormState(merged, errors),
  });
}

function transitionCreateCarrierToConfirmOrForm(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  preamble?: string,
  followUp?: string,
): ChatApiSuccessBody {
  const vr = validateCollectedParamsBeforeExecute(def, merged);
  if (!vr.ok) {
    const message = [preamble, CREATE_DRAFT_FORM_FAIL_COPY, followUp]
      .filter(Boolean)
      .join("\n\n");
    const session = updateSession(sessionId, {
      phase: "collecting",
      collectedParams: merged,
      awaitingConfirmation: false,
      pendingFieldKey: null,
      optionalFieldQueue: [],
      missingFieldKeys: [],
      createCarrierSkipOptionalWalkthrough: true,
      createCarrierFormFirst: true,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: buildCreateCarrierDraftFormState(merged, vr.errors),
    });
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
    createCarrierSkipOptionalWalkthrough: false,
    createCarrierFormFirst: false,
    step: cur2.step + 1,
    appendToHistory: [assistantMessage(cardText)],
  });
  return composeBody(session, {
    responseType: "confirm",
    message: cardText,
    summaryCard,
    missingFields: [],
    awaitingConfirmation: true,
    createCarrierDraftForm: null,
  });
}

function continueCreateCarrierDraftAfterRequired(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  preamble?: string,
  followUp?: string,
): ChatApiSuccessBody {
  const queue = getOptionalFieldKeysInOrder(def, merged);
  if (queue.length === 0) {
    return transitionCreateCarrierToConfirmOrForm(
      sessionId,
      def,
      merged,
      preamble,
      followUp,
    );
  }
  const pk = queue[0]!;
  const field = findFieldDef(def, pk, merged)!;
  const message = [
    preamble,
    "Optional details — say **skip** to skip any.",
    field.businessPrompt,
    followUp,
  ]
    .filter(Boolean)
    .join("\n\n");
  const cur = getSession(sessionId);
  const session = updateSession(sessionId, {
    currentWorkflowId: def.id,
    phase: "collecting",
    collectedParams: merged,
    missingFieldKeys: [],
    pendingFieldKey: pk,
    awaitingConfirmation: false,
    optionalFieldQueue: queue,
    createCarrierSkipOptionalWalkthrough: false,
    createCarrierFormFirst: false,
    step: cur.step + 1,
    appendToHistory: [assistantMessage(message)],
  });
  return composeBody(session, {
    responseType: "needs_input",
    message,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
  });
}

function handleCreateCarrierCollecting(
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
    pending !== null && rejected.some((r) => r.key === pending);

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
      analysis.suggestedFollowUp,
    ]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      missingFieldKeys: missingReq,
      pendingFieldKey: pk,
      optionalFieldQueue: [],
      createCarrierSkipOptionalWalkthrough: false,
      createCarrierFormFirst: false,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: err ? "error" : "needs_input",
      message,
      missingFields: missingReq,
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  if (queue.length > 0) {
    const pk = queue[0]!;
    const field = findFieldDef(def, pk, merged)!;
    const err = headRejected
      ? rejected.find((r) => r.key === pending)
      : undefined;
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
      createCarrierFormFirst: false,
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: err ? "error" : "needs_input",
      message,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  return transitionCreateCarrierToConfirmOrForm(
    sessionId,
    def,
    merged,
    analysis.naturalPreamble,
    analysis.suggestedFollowUp,
  );
}

async function handleCreateCarrierDraftFormSubmit(
  sessionId: string,
  session: AssistantSessionState,
  form: Record<string, unknown>,
): Promise<ChatApiSuccessBody> {
  const def = getWorkflowDefinition("create_carrier_draft")!;
  const merged = mergeCreateCarrierDraftFormIntoCollected(
    session.collectedParams,
    form,
  );
  const vr = validateCreateCarrierDraftMerged(merged);
  if (!vr.ok) {
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      phase: "collecting",
      awaitingConfirmation: false,
      pendingFieldKey: null,
      optionalFieldQueue: [],
      missingFieldKeys: [],
      createCarrierSkipOptionalWalkthrough: true,
      createCarrierFormFirst: true,
      appendToHistory: [assistantMessage(CREATE_DRAFT_FORM_FAIL_COPY)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: CREATE_DRAFT_FORM_FAIL_COPY,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: buildCreateCarrierDraftFormState(
        merged,
        vr.errors,
      ),
    });
  }

  return transitionCreateCarrierToConfirmOrForm(
    sessionId,
    def,
    merged,
    "Form submitted.",
  );
}

function startUpdateCarrierFormFlow(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  _analysis: IntentAnalysisResult,
  rejected: { key: string; error: string }[],
): ChatApiSuccessBody {
  const cur = getSession(sessionId);
  const hadCarrierAttempt =
    merged.carrierCode !== undefined &&
    merged.carrierCode !== null &&
    String(merged.carrierCode).trim() !== "";
  const codeVal = validateCarrierCode(merged.carrierCode);

  if (codeVal.ok) {
    const msg = `Carrier **${codeVal.normalized}**. Pick a section below.`;
    const session = updateSession(sessionId, {
      currentWorkflowId: def.id,
      phase: "collecting",
      collectedParams: { carrierCode: codeVal.normalized },
      updateCarrierUiPhase: "pick_category",
      missingFieldKeys: [],
      pendingFieldKey: null,
      optionalFieldQueue: [],
      awaitingConfirmation: false,
      step: cur.step + 1,
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  const codeErr =
    hadCarrierAttempt && !codeVal.ok
      ? codeVal.error
      : rejected.find((r) => r.key === "carrierCode")?.error;

  const introMsg = "";

  const session = updateSession(sessionId, {
    currentWorkflowId: def.id,
    phase: "collecting",
    collectedParams: {},
    updateCarrierUiPhase: "need_code",
    missingFieldKeys: [],
    pendingFieldKey: null,
    optionalFieldQueue: [],
    awaitingConfirmation: false,
    step: cur.step + 1,
    appendToHistory: [assistantMessage(introMsg)],
  });

  return composeBody(session, {
    responseType: codeErr ? "error" : "needs_input",
    message: introMsg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
    updateCarrierFlow: codeErr
      ? { step: "need_code", codeError: codeErr }
      : { step: "need_code" },
  });
}

function handleUpdateCarrierCodeSubmit(
  sessionId: string,
  rawCode: string,
): ChatApiSuccessBody {
  const codeVal = validateCarrierCode(rawCode);
  if (!codeVal.ok) {
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(codeVal.error)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: codeVal.error,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: { step: "need_code", codeError: codeVal.error },
    });
  }
  const msg = `Carrier **${codeVal.normalized}**. Pick a section to update.`;
  const session = updateSession(sessionId, {
    collectedParams: { carrierCode: codeVal.normalized },
    updateCarrierUiPhase: "pick_category",
    appendToHistory: [assistantMessage(msg)],
  });
  return composeBody(session, {
    responseType: "needs_input",
    message: msg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
  });
}

function handleUpdateCarrierCategorySubmit(
  sessionId: string,
  session: AssistantSessionState,
  categoryRaw: string,
): ChatApiSuccessBody {
  const codeVal = validateCarrierCode(session.collectedParams.carrierCode);
  if (!codeVal.ok) {
    const msg = "Enter the carrier code again.";
    const s2 = updateSession(sessionId, {
      collectedParams: {},
      updateCarrierUiPhase: "need_code",
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: { step: "need_code" },
    });
  }

  const catVal = validateUpdateCategory(categoryRaw);
  if (!catVal.ok) {
    const msg = [catVal.error, "Pick a section from the list."]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "pick_category",
        carrierCode: String(codeVal.normalized),
        categories: listUpdateCarrierCategories(),
        categoryError: catVal.error,
      },
    });
  }

  const cat = catVal.normalized as UpdateCategoryId;
  const merged = {
    ...session.collectedParams,
    carrierCode: codeVal.normalized,
    updateCategory: cat,
  };
  const msg = `**${UPDATE_CATEGORY_LABELS[cat]}** — fill changes, then save.`;
  const session2 = updateSession(sessionId, {
    collectedParams: merged,
    updateCarrierUiPhase: "section_form",
    appendToHistory: [assistantMessage(msg)],
  });
  return composeBody(session2, {
    responseType: "needs_input",
    message: msg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
  });
}

function handleUpdateCarrierCategoriesSelectionSubmit(
  sessionId: string,
  session: AssistantSessionState,
  categoryIds: string[],
): ChatApiSuccessBody {
  const codeVal = validateCarrierCode(session.collectedParams.carrierCode);
  if (!codeVal.ok) {
    const msg = "Enter the carrier code again.";
    const s2 = updateSession(sessionId, {
      collectedParams: {},
      updateCarrierUiPhase: "need_code",
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: { step: "need_code" },
    });
  }

  const unique = [...new Set(categoryIds.map((s) => s.trim()).filter(Boolean))];
  const valid: UpdateCategoryId[] = [];
  let firstErr: string | undefined;
  for (const id of unique) {
    const v = validateUpdateCategory(id);
    if (v.ok) {
      valid.push(v.normalized as UpdateCategoryId);
    } else if (!firstErr) {
      firstErr = v.error;
    }
  }

  if (valid.length === 0) {
    const msg = firstErr ?? "Select at least one section.";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "pick_category",
        carrierCode: String(codeVal.normalized),
        categories: listUpdateCarrierCategories(),
        multiSelect: true,
        categoryError: firstErr,
      },
    });
  }

  const merged: Record<string, unknown> = {
    ...session.collectedParams,
    carrierCode: codeVal.normalized,
    selectedUpdateCategories: valid,
  };
  const msg =
    valid.length === 1
      ? `**${UPDATE_CATEGORY_LABELS[valid[0]!]}** — fill changes below, then submit.`
      : `**${valid.length} sections** — fill changes below, then submit.`;
  const session2 = updateSession(sessionId, {
    collectedParams: merged,
    updateCarrierUiPhase: "multi_section_form",
    appendToHistory: [assistantMessage(msg)],
  });
  return composeBody(session2, {
    responseType: "needs_input",
    message: msg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
  });
}

async function executeUpdateCarrierAfterSectionConfirm(
  sessionId: string,
  session: AssistantSessionState,
): Promise<ChatApiSuccessBody> {
  const def = getWorkflowDefinition("update_carrier")!;
  const data = session.collectedParams;
  const multiRaw = data.selectedUpdateCategories;
  const multiCats =
    Array.isArray(multiRaw) && multiRaw.length > 0
      ? multiRaw.filter(
          (c): c is UpdateCategoryId =>
            typeof c === "string" && isUpdateCategoryId(c),
        )
      : null;

  if (multiCats && multiCats.length > 0) {
    try {
      const result = await executeDefinition(def, data);
      const formatted = formatSuccessResponse(def, result);
      const stripped = stripMultiCategoryKeysFromCollected(data, multiCats);
      const msg = [
        formatted.message,
        "",
        "Update more sections below, or use **Continue** when done.",
      ].join("\n");
      const s2 = updateSession(sessionId, {
        currentWorkflowId: "update_carrier",
        phase: "collecting",
        collectedParams: stripped,
        updateCarrierUiPhase: "pick_category",
        awaitingConfirmation: false,
        missingFieldKeys: [],
        pendingFieldKey: null,
        optionalFieldQueue: [],
        appendToHistory: [assistantMessage(msg)],
      });
      return composeBody(s2, {
        responseType: "needs_input",
        message: msg,
        summaryCard: {
          title: "Updated",
          fields: buildUpdateSuccessSummaryCardFields(
            result as CarrierDetails,
            data,
          ),
          actions: formatted.actions,
        },
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
        displayWorkflowId: "update_carrier",
        displayWorkflowName: def.userFacingLabel,
        resultData: result,
      });
    } catch (e) {
      let fieldErrors: Record<string, string> = {};
      let formLevel: string | undefined;
      if (e instanceof ZinniaApiError) {
        const p = parseZinniaUpdateCarrierErrorBody(e.bodyText);
        fieldErrors = p.fieldErrors;
        formLevel =
          p.formLevelMessage ?? formatChatWorkflowError(e, def, data);
      } else {
        formLevel = formatChatWorkflowError(e, def, data);
      }
      const failMsg = formLevel ?? "Update failed.";
      const s2 = updateSession(sessionId, {
        collectedParams: data,
        updateCarrierUiPhase: "multi_section_form",
        awaitingConfirmation: false,
        phase: "collecting",
        appendToHistory: [assistantMessage(failMsg)],
      });
      const code = String(data.carrierCode ?? "").toUpperCase();
      const categoryForms = multiCats.map((id) => ({
        categoryId: id,
        categoryLabel: UPDATE_CATEGORY_LABELS[id],
        form: buildUpdateSectionFormState(
          data,
          id,
          fieldErrors,
          Object.keys(fieldErrors).length === 0 ? formLevel : undefined,
        ),
      }));
      return composeBody(s2, {
        responseType: "error",
        message: failMsg,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
        updateCarrierFlow: {
          step: "multi_section_form",
          carrierCode: code,
          categoryForms,
        },
      });
    }
  }

  const catRaw = data.updateCategory;
  if (typeof catRaw !== "string" || !isUpdateCategoryId(catRaw)) {
    const msg = "Choose a section again.";
    const s2 = updateSession(sessionId, {
      updateCarrierUiPhase: "pick_category",
      awaitingConfirmation: false,
      phase: "collecting",
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }
  const cat = catRaw as UpdateCategoryId;
  try {
    const result = await executeDefinition(def, data);
    const formatted = formatSuccessResponse(def, result);
    const stripped = stripUpdateCategoryKeysFromCollected(data, cat);
    const msg = [formatted.message, "", "Update another section below, or start a new chat when done."].join(
      "\n",
    );
    const s2 = updateSession(sessionId, {
      currentWorkflowId: "update_carrier",
      phase: "collecting",
      collectedParams: stripped,
      updateCarrierUiPhase: "pick_category",
      awaitingConfirmation: false,
      missingFieldKeys: [],
      pendingFieldKey: null,
      optionalFieldQueue: [],
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: msg,
      summaryCard: {
        title: "Updated",
        fields: buildUpdateSuccessSummaryCardFields(
          result as CarrierDetails,
          data,
        ),
        actions: formatted.actions,
      },
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      displayWorkflowId: "update_carrier",
      displayWorkflowName: def.userFacingLabel,
      resultData: result,
    });
  } catch (e) {
    let fieldErrors: Record<string, string> = {};
    let formLevel: string | undefined;
    if (e instanceof ZinniaApiError) {
      const p = parseZinniaUpdateCarrierErrorBody(e.bodyText);
      fieldErrors = p.fieldErrors;
      formLevel =
        p.formLevelMessage ?? formatChatWorkflowError(e, def, data);
    } else {
      formLevel = formatChatWorkflowError(e, def, data);
    }
    const failMsg = formLevel ?? "Update failed.";
    const s2 = updateSession(sessionId, {
      collectedParams: data,
      updateCarrierUiPhase: "section_form",
      awaitingConfirmation: false,
      phase: "collecting",
      appendToHistory: [assistantMessage(failMsg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: failMsg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "section_form",
        carrierCode: String(data.carrierCode ?? "").toUpperCase(),
        categoryId: cat,
        categoryLabel: UPDATE_CATEGORY_LABELS[cat],
        form: buildUpdateSectionFormState(
          data,
          cat,
          fieldErrors,
          Object.keys(fieldErrors).length === 0 ? formLevel : undefined,
        ),
      },
    });
  }
}

async function handleUpdateCarrierMultiSectionFormSubmit(
  sessionId: string,
  session: AssistantSessionState,
  values: Record<string, string>,
): Promise<ChatApiSuccessBody> {
  const def = getWorkflowDefinition("update_carrier")!;
  const data = session.collectedParams;
  const rawCats = data.selectedUpdateCategories;
  const cats = Array.isArray(rawCats)
    ? rawCats.filter(
        (c): c is UpdateCategoryId =>
          typeof c === "string" && isUpdateCategoryId(c),
      )
    : [];
  if (cats.length === 0) {
    const msg = "Choose sections again.";
    const s2 = updateSession(sessionId, {
      updateCarrierUiPhase: "pick_category",
      awaitingConfirmation: false,
      phase: "collecting",
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  type CatErr = { errors: Record<string, string>; formLevel?: string };
  const errorsByCat: Partial<Record<UpdateCategoryId, CatErr>> = {};
  let working: Record<string, unknown> = {
    ...data,
    selectedUpdateCategories: cats,
  };
  delete working.updateCategory;

  for (const cat of cats) {
    const slice = sliceUpdateSectionValuesFromFlat(values, cat);
    const vr = validateAndMergeUpdateCarrierSection({ ...working }, cat, slice);
    if (!vr.ok) {
      errorsByCat[cat] = {
        errors: vr.errors,
        formLevel: vr.formLevelError,
      };
    } else {
      working = vr.merged;
    }
  }

  if (Object.keys(errorsByCat).length > 0) {
    const failMsg = "Fix the highlighted fields, then submit again.";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(failMsg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: failMsg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "multi_section_form",
        carrierCode: String(data.carrierCode ?? "").toUpperCase(),
        categoryForms: cats.map((id) => {
          const slice = sliceUpdateSectionValuesFromFlat(values, id);
          const er = errorsByCat[id];
          return {
            categoryId: id,
            categoryLabel: UPDATE_CATEGORY_LABELS[id],
            form: buildUpdateSectionFormStateFromStrings(
              id,
              slice,
              er?.errors ?? {},
              er?.formLevel,
            ),
          };
        }),
      },
    });
  }

  delete working.updateCategory;
  working.selectedUpdateCategories = cats;

  const { cardText, summaryCard } = resolveConfirmationUi(def, working);
  const session2 = updateSession(sessionId, {
    collectedParams: working,
    updateCarrierUiPhase: "section_confirm",
    phase: "confirming",
    awaitingConfirmation: true,
    appendToHistory: [assistantMessage(cardText)],
  });
  return composeBody(session2, {
    responseType: "confirm",
    message: cardText,
    summaryCard,
    missingFields: [],
    awaitingConfirmation: true,
    createCarrierDraftForm: null,
    updateCarrierFlow: null,
  });
}

async function handleUpdateCarrierSectionFormSubmit(
  sessionId: string,
  session: AssistantSessionState,
  values: Record<string, string>,
): Promise<ChatApiSuccessBody> {
  const def = getWorkflowDefinition("update_carrier")!;
  const data = session.collectedParams;
  const catRaw = data.updateCategory;
  if (typeof catRaw !== "string" || !isUpdateCategoryId(catRaw)) {
    const msg = "Choose a section again.";
    const s2 = updateSession(sessionId, {
      updateCarrierUiPhase: "pick_category",
      awaitingConfirmation: false,
      phase: "collecting",
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }
  const cat = catRaw as UpdateCategoryId;
  const base = { ...data };
  const vr = validateAndMergeUpdateCarrierSection(base, cat, values);
  if (!vr.ok) {
    const failMsg = vr.formLevelError ?? "Check the form below.";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(failMsg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: failMsg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "section_form",
        carrierCode: String(base.carrierCode ?? "").toUpperCase(),
        categoryId: cat,
        categoryLabel: UPDATE_CATEGORY_LABELS[cat],
        form: buildUpdateSectionFormStateFromStrings(
          cat,
          values,
          vr.errors,
          vr.formLevelError,
        ),
      },
    });
  }

  const { cardText, summaryCard } = resolveConfirmationUi(def, vr.merged);
  const session2 = updateSession(sessionId, {
    collectedParams: vr.merged,
    updateCarrierUiPhase: "section_confirm",
    phase: "confirming",
    awaitingConfirmation: true,
    appendToHistory: [assistantMessage(cardText)],
  });
  return composeBody(session2, {
    responseType: "confirm",
    message: cardText,
    summaryCard,
    missingFields: [],
    awaitingConfirmation: true,
    createCarrierDraftForm: null,
    updateCarrierFlow: null,
  });
}

function handleUpdateCarrierNavigate(
  sessionId: string,
  session: AssistantSessionState,
  target: "back_carrier_code" | "back_categories",
): ChatApiSuccessBody {
  if (target === "back_carrier_code") {
    const ph = session.updateCarrierUiPhase;
    if (
      ph !== "pick_category" &&
      ph !== "multi_section_form" &&
      ph !== "section_form"
    ) {
      const s = getSession(sessionId);
      return composeBody(s, {
        responseType: "needs_input",
        message: "Use Back from the category list or section form.",
        awaitingConfirmation: false,
      });
    }
    const msg = "Enter the **carrier code** below.";
    const s2 = updateSession(sessionId, {
      collectedParams: {},
      updateCarrierUiPhase: "need_code",
      phase: "collecting",
      awaitingConfirmation: false,
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  const ph = session.updateCarrierUiPhase;
  if (
    ph !== "section_form" &&
    ph !== "section_confirm" &&
    ph !== "multi_section_form"
  ) {
    const s = getSession(sessionId);
    return composeBody(s, {
      responseType: "needs_input",
      message: "Open a section form first.",
      awaitingConfirmation: false,
    });
  }

  const data = session.collectedParams;
  const multiRaw = data.selectedUpdateCategories;
  const multiCats =
    Array.isArray(multiRaw) && multiRaw.length > 0
      ? multiRaw.filter(
          (c): c is UpdateCategoryId =>
            typeof c === "string" && isUpdateCategoryId(c),
        )
      : [];

  let nextCollected: Record<string, unknown>;
  if (multiCats.length > 0) {
    nextCollected = stripMultiCategoryKeysFromCollected(data, multiCats);
  } else {
    const cat = data.updateCategory;
    if (typeof cat === "string" && isUpdateCategoryId(cat)) {
      nextCollected = stripUpdateCategoryKeysFromCollected(data, cat);
    } else {
      nextCollected = { ...data };
      delete nextCollected.updateCategory;
    }
  }

  const codeVal = validateCarrierCode(nextCollected.carrierCode);
  if (!codeVal.ok) {
    const msg = "Enter a valid carrier code below.";
    const s2 = updateSession(sessionId, {
      collectedParams: {},
      updateCarrierUiPhase: "need_code",
      phase: "collecting",
      awaitingConfirmation: false,
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }

  nextCollected.carrierCode = String(codeVal.normalized);
  const msg = "Pick one or more sections to update, or change the code.";
  const s2 = updateSession(sessionId, {
    collectedParams: nextCollected,
    updateCarrierUiPhase: "pick_category",
    phase: "collecting",
    awaitingConfirmation: false,
    appendToHistory: [assistantMessage(msg)],
  });
  return composeBody(s2, {
    responseType: "needs_input",
    message: msg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
  });
}

function handleUpdateCarrierFormCollectingMerge(
  sessionId: string,
  session: AssistantSessionState,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  rejected: { key: string; error: string }[],
  analysis: IntentAnalysisResult,
): ChatApiSuccessBody {
  const phase = session.updateCarrierUiPhase ?? "none";
  const preamble = analysis.naturalPreamble;
  const followUp = analysis.suggestedFollowUp;

  if (phase === "need_code") {
    const codeVal = validateCarrierCode(merged.carrierCode);
    if (codeVal.ok) {
      const msg = [
        preamble,
        `**${codeVal.normalized}** — pick a section.`,
        followUp,
      ]
        .filter(Boolean)
        .join("\n\n");
      const session2 = updateSession(sessionId, {
        collectedParams: { carrierCode: codeVal.normalized },
        updateCarrierUiPhase: "pick_category",
        appendToHistory: [assistantMessage(msg)],
      });
      return composeBody(session2, {
        responseType: "needs_input",
        message: msg,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
      });
    }
    const err = rejected.find((r) => r.key === "carrierCode");
    const msg = [
      preamble,
      err?.error,
      "Enter a valid 4-character carrier code.",
      followUp,
    ]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: err ? "error" : "needs_input",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: err
        ? { step: "need_code", codeError: err.error }
        : undefined,
    });
  }

  if (phase === "pick_category") {
    const catVal = validateUpdateCategory(merged.updateCategory);
    if (catVal.ok) {
      const cat = catVal.normalized as UpdateCategoryId;
      const codeRes = validateCarrierCode(session.collectedParams.carrierCode);
      const mergedParams = {
        ...session.collectedParams,
        ...merged,
        carrierCode: codeRes.ok ? codeRes.normalized : session.collectedParams.carrierCode,
        updateCategory: cat,
      };
      const msg = [
        preamble,
        `**${UPDATE_CATEGORY_LABELS[cat]}** — use the form for changes.`,
        followUp,
      ]
        .filter(Boolean)
        .join("\n\n");
      const session2 = updateSession(sessionId, {
        collectedParams: mergedParams,
        updateCarrierUiPhase: "section_form",
        appendToHistory: [assistantMessage(msg)],
      });
      return composeBody(session2, {
        responseType: "needs_input",
        message: msg,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
      });
    }
    const err = rejected.find((r) => r.key === "updateCategory");
    const msg = [
      preamble,
      err?.error ?? catVal.error,
      "Pick a section from the list.",
      followUp,
    ]
      .filter(Boolean)
      .join("\n\n");
    const codeOk = validateCarrierCode(session.collectedParams.carrierCode);
    const code = codeOk.ok ? String(codeOk.normalized) : "";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "error",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: {
        step: "pick_category",
        carrierCode: code,
        categories: listUpdateCarrierCategories(),
        categoryError: err?.error ?? catVal.error,
      },
    });
  }

  const errors = rejectedToErrorMap(rejected);
  const hint =
    rejected.length > 0
      ? "Some values weren’t applied — see the form."
      : "Your message was applied to the form below.";
  const msg = [preamble, hint, followUp].filter(Boolean).join("\n\n");
  const mergedParams = {
    ...session.collectedParams,
    ...merged,
  };
  const catRaw =
    mergedParams.updateCategory ?? session.collectedParams.updateCategory;
  const s2 = updateSession(sessionId, {
    collectedParams: mergedParams,
    appendToHistory: [assistantMessage(msg)],
  });
  if (typeof catRaw !== "string" || !isUpdateCategoryId(catRaw)) {
    return composeBody(s2, {
      responseType: "needs_input",
      message: msg,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
    });
  }
  const cid = catRaw as UpdateCategoryId;
  return composeBody(s2, {
    responseType: rejected.length > 0 ? "error" : "needs_input",
    message: msg,
    missingFields: [],
    awaitingConfirmation: false,
    createCarrierDraftForm: null,
    updateCarrierFlow: {
      step: "section_form",
      carrierCode: String(mergedParams.carrierCode ?? "").toUpperCase(),
      categoryId: cid,
      categoryLabel: UPDATE_CATEGORY_LABELS[cid],
      form: buildUpdateSectionFormState(mergedParams, cid, errors),
    },
  });
}

async function continueAfterMerge(
  sessionId: string,
  def: WorkflowDefinition,
  merged: Record<string, unknown>,
  analysis: IntentAnalysisResult,
): Promise<ChatApiSuccessBody> {
  const preamble = analysis.naturalPreamble;
  const followUp = analysis.suggestedFollowUp;

  if (def.id === "create_carrier_draft") {
    const missingCreate = getMissingFields(def, merged);
    if (missingCreate.length > 0) {
      const pk = missingCreate[0]!;
      const field = findFieldDef(def, pk, merged)!;
      const message = buildCreateCarrierCollectingMessage({
        missingCount: missingCreate.length,
        fieldPrompt: field.businessPrompt,
        preamble,
        followUp,
      });
      const cur = getSession(sessionId);
      const session = updateSession(sessionId, {
        currentWorkflowId: def.id,
        phase: "collecting",
        collectedParams: merged,
        missingFieldKeys: missingCreate,
        pendingFieldKey: pk,
        awaitingConfirmation: false,
        optionalFieldQueue: [],
        createCarrierSkipOptionalWalkthrough: false,
        createCarrierFormFirst: false,
        step: cur.step + 1,
        appendToHistory: [assistantMessage(message)],
      });
      return composeBody(session, {
        responseType: "needs_input",
        message,
        missingFields: missingCreate,
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
      });
    }
    const curSkip = getSession(sessionId);
    if (curSkip.createCarrierSkipOptionalWalkthrough) {
      return transitionCreateCarrierToConfirmOrForm(
        sessionId,
        def,
        merged,
        preamble,
        followUp,
      );
    }
    return continueCreateCarrierDraftAfterRequired(
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
      def.id === "find_carrier"
        ? buildFindCarrierCollectingMessage({
            fieldPrompt: field.businessPrompt,
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
        ? "Which carrier? Enter the code."
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
    const msg = "Update flow isn’t configured.";
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

  const { merged: mergedInitial, rejected } = mergeExtractedFields(
    def,
    {},
    extractedToRecord(analysis.extractedFields),
  );
  let merged = mergedInitial;

  if (
    def.id === "find_carrier" &&
    !hasCarrierCodeTokenInMessage(text)
  ) {
    merged = { ...merged };
    delete merged.carrierCode;
  }

  if (def.id === "update_carrier") {
    const fromPhrase = carrierCodeFromUpdateCarrierPhrase(text);
    if (fromPhrase) {
      merged = { ...merged, carrierCode: fromPhrase };
    }
  }

  if (def.id === "create_carrier_draft") {
    return startCreateCarrierWithForm(
      sessionId,
      def,
      merged,
      analysis,
      rejected,
    );
  }

  if (def.id === "update_carrier") {
    return startUpdateCarrierFormFlow(sessionId, def, merged, analysis, rejected);
  }

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
      def.id === "find_carrier" && nextField
        ? buildFindCarrierCollectingMessage({
            fieldPrompt: nextField.businessPrompt,
            validationNote: first.error,
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
      createCarrierSkipOptionalWalkthrough: false,
      createCarrierFormFirst: false,
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

  if (def.id === "create_carrier_draft" && (session.createCarrierFormFirst ?? false)) {
    const errors = rejectedToErrorMap(rejected);
    const hint =
      rejected.length > 0
        ? "Some values weren’t applied — check the form."
        : "Applied to the form below. Submit to continue.";
    const message = [analysis.naturalPreamble, hint, analysis.suggestedFollowUp]
      .filter(Boolean)
      .join("\n\n");
    const s2 = updateSession(sessionId, {
      collectedParams: merged,
      missingFieldKeys: [],
      pendingFieldKey: null,
      optionalFieldQueue: [],
      appendToHistory: [assistantMessage(message)],
    });
    return composeBody(s2, {
      responseType: rejected.length > 0 ? "error" : "needs_input",
      message,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: buildCreateCarrierDraftFormState(merged, errors),
    });
  }

  if (def.id === "update_carrier") {
    const uPhase = session.updateCarrierUiPhase ?? "none";
    if (uPhase !== "none" && uPhase !== "section_confirm") {
      return handleUpdateCarrierFormCollectingMerge(
        sessionId,
        session,
        def,
        merged,
        rejected,
        analysis,
      );
    }
    return handleUpdateCarrierCollecting(
      sessionId,
      def,
      session,
      merged,
      rejected,
      analysis,
    );
  }

  if (def.id === "create_carrier_draft" && session.optionalFieldQueue.length > 0) {
    return handleCreateCarrierCollecting(
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
              validationNote: pendingReject.error,
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

  if (
    def.id === "create_carrier_draft" &&
    (session.createCarrierSkipOptionalWalkthrough ?? false)
  ) {
    return transitionCreateCarrierToConfirmOrForm(
      sessionId,
      def,
      merged,
      analysis.naturalPreamble,
      analysis.suggestedFollowUp,
    );
  }

  return await continueAfterMerge(sessionId, def, merged, analysis);
}

async function handleConfirmTurn(
  sessionId: string,
  text: string,
  session: AssistantSessionState,
): Promise<ChatApiSuccessBody> {
  const decision = parseConfirmation(text);
  const live = getSession(sessionId);

  if (
    live.currentWorkflowId === "update_carrier" &&
    live.updateCarrierUiPhase === "section_confirm"
  ) {
    if (decision === "no") {
      const liveParams = getSession(sessionId).collectedParams;
      const multiRaw = liveParams.selectedUpdateCategories;
      const hasMulti =
        Array.isArray(multiRaw) &&
        multiRaw.length > 0 &&
        multiRaw.every(
          (c) => typeof c === "string" && isUpdateCategoryId(c),
        );
      const msg = hasMulti
        ? "Adjust the forms below, then submit again."
        : "Adjust the form below, then submit again.";
      const s2 = updateSession(sessionId, {
        updateCarrierUiPhase: hasMulti ? "multi_section_form" : "section_form",
        awaitingConfirmation: false,
        phase: "collecting",
        appendToHistory: [assistantMessage(msg)],
      });
      return composeBody(s2, {
        responseType: "needs_input",
        message: msg,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: null,
      });
    }
    if (decision === "yes") {
      return await executeUpdateCarrierAfterSectionConfirm(
        sessionId,
        getSession(sessionId),
      );
    }
    const defU = getWorkflowDefinition("update_carrier")!;
    const { cardText, summaryCard } = resolveConfirmationUi(
      defU,
      live.collectedParams,
    );
    const msg = "**Yes** to apply, **no** to edit, or use **Choose a different section**.";
    const s2 = updateSession(sessionId, {
      appendToHistory: [assistantMessage(msg)],
    });
    return composeBody(s2, {
      responseType: "confirm",
      message: [msg, "", cardText].filter(Boolean).join("\n\n"),
      summaryCard,
      awaitingConfirmation: true,
      createCarrierDraftForm: null,
      updateCarrierFlow: null,
    });
  }

  if (decision === "no") {
    const s2 = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [
        assistantMessage("Cancelled. What next?"),
      ],
    });
    return composeBody(s2, {
      responseType: "needs_input",
      message: "Cancelled. What next?",
      awaitingConfirmation: false,
    });
  }
  if (decision !== "yes") {
    const msg = "Reply **yes** or **no**.";
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
      message: "Error. Start fresh — what do you need?",
      awaitingConfirmation: false,
    });
  }

  if (def.id === "create_carrier_draft") {
    const vr = validateCollectedParamsBeforeExecute(
      def,
      session.collectedParams,
    );
    if (!vr.ok) {
      const sForm = updateSession(sessionId, {
        phase: "collecting",
        awaitingConfirmation: false,
        pendingFieldKey: null,
        optionalFieldQueue: [],
        missingFieldKeys: [],
        createCarrierSkipOptionalWalkthrough: true,
        createCarrierFormFirst: true,
        appendToHistory: [assistantMessage(CREATE_DRAFT_FORM_FAIL_COPY)],
      });
      return composeBody(sForm, {
        responseType: "needs_input",
        message: CREATE_DRAFT_FORM_FAIL_COPY,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: buildCreateCarrierDraftFormState(
          session.collectedParams,
          vr.errors,
        ),
      });
    }
  }

  try {
    const result = await executeDefinition(def, session.collectedParams);
    const formatted = formatSuccessResponse(def, result);
    const s2 = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(formatted.message)],
    });
    const summaryCard =
      def.id === "update_carrier"
        ? {
            title: "Updated" as const,
            fields: buildUpdateSuccessSummaryCardFields(
              result as CarrierDetails,
              session.collectedParams,
            ),
          }
        : buildSuccessSummaryCard(def, formatted);
    return composeBody(s2, {
      responseType: "success",
      message: formatted.message,
      summaryCard,
      resultData:
        def.id === "create_carrier_draft" || def.id === "update_carrier"
          ? result
          : undefined,
      displayWorkflowId:
        def.id === "create_carrier_draft" || def.id === "update_carrier"
          ? def.id
          : undefined,
      displayWorkflowName:
        def.id === "create_carrier_draft" || def.id === "update_carrier"
          ? def.userFacingLabel
          : undefined,
      missingFields: [],
      awaitingConfirmation: false,
      createCarrierDraftForm: null,
      updateCarrierFlow: null,
    });
  } catch (e) {
    if (def.id === "create_carrier_draft" && e instanceof ZinniaApiError) {
      const { fieldErrors, formLevelMessage } =
        parseZinniaCreateDraftErrorBody(e.bodyText);
      const headline =
        formLevelMessage ??
        (Object.keys(fieldErrors).length > 0
          ? "Check the form for field errors."
          : e.message);
      const s2 = updateSession(sessionId, {
        phase: "collecting",
        awaitingConfirmation: false,
        pendingFieldKey: null,
        optionalFieldQueue: [],
        missingFieldKeys: [],
        createCarrierSkipOptionalWalkthrough: true,
        createCarrierFormFirst: true,
        appendToHistory: [assistantMessage(headline)],
      });
      return composeBody(s2, {
        responseType: "error",
        message: headline,
        missingFields: [],
        awaitingConfirmation: false,
        createCarrierDraftForm: buildCreateCarrierDraftFormState(
          session.collectedParams,
          fieldErrors,
          Object.keys(fieldErrors).length === 0
            ? (formLevelMessage ?? headline)
            : formLevelMessage,
        ),
      });
    }

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
  createCarrierDraftForm?: Record<string, unknown>;
  updateCarrierCode?: string;
  updateCarrierCategoryId?: string;
  updateCarrierCategoryIds?: string[];
  updateCarrierSectionForm?: Record<string, string>;
  updateCarrierNavigate?: "back_carrier_code" | "back_categories";
}): Promise<ChatApiSuccessBody> {
  const sessionId = input.sessionId.trim();
  const text = input.message.trim();
  let session = getSession(sessionId);

  const draftForm = input.createCarrierDraftForm;
  if (
    draftForm &&
    typeof draftForm === "object" &&
    !Array.isArray(draftForm) &&
    session.currentWorkflowId === "create_carrier_draft"
  ) {
    session = updateSession(sessionId, {
      appendToHistory: [
        userMessage("Submitted draft form."),
      ],
    });
    return await handleCreateCarrierDraftFormSubmit(
      sessionId,
      getSession(sessionId),
      draftForm,
    );
  }

  const navigate = input.updateCarrierNavigate;
  if (
    (navigate === "back_carrier_code" || navigate === "back_categories") &&
    session.currentWorkflowId === "update_carrier"
  ) {
    session = updateSession(sessionId, {
      appendToHistory: [
        userMessage(
          navigate === "back_carrier_code"
            ? "Change carrier code."
            : "Choose a different section.",
        ),
      ],
    });
    return handleUpdateCarrierNavigate(
      sessionId,
      getSession(sessionId),
      navigate,
    );
  }

  const sectionForm = input.updateCarrierSectionForm;
  if (
    sectionForm &&
    typeof sectionForm === "object" &&
    !Array.isArray(sectionForm) &&
    session.currentWorkflowId === "update_carrier" &&
    (session.updateCarrierUiPhase === "section_form" ||
      session.updateCarrierUiPhase === "multi_section_form")
  ) {
    session = updateSession(sessionId, {
      appendToHistory: [
        userMessage("Submitted update form."),
      ],
    });
    const live = getSession(sessionId);
    if (live.updateCarrierUiPhase === "multi_section_form") {
      return await handleUpdateCarrierMultiSectionFormSubmit(
        sessionId,
        live,
        sectionForm,
      );
    }
    return await handleUpdateCarrierSectionFormSubmit(
      sessionId,
      live,
      sectionForm,
    );
  }

  const updCategoryIds = input.updateCarrierCategoryIds;
  if (
    Array.isArray(updCategoryIds) &&
    updCategoryIds.length > 0 &&
    session.currentWorkflowId === "update_carrier" &&
    session.updateCarrierUiPhase === "pick_category"
  ) {
    session = updateSession(sessionId, {
      appendToHistory: [
        userMessage(`Selected sections: ${updCategoryIds.join(", ")}.`),
      ],
    });
    return handleUpdateCarrierCategoriesSelectionSubmit(
      sessionId,
      getSession(sessionId),
      updCategoryIds,
    );
  }

  const updCategoryId = input.updateCarrierCategoryId;
  if (
    typeof updCategoryId === "string" &&
    updCategoryId.trim() &&
    session.currentWorkflowId === "update_carrier" &&
    session.updateCarrierUiPhase === "pick_category"
  ) {
    session = updateSession(sessionId, {
      appendToHistory: [
        userMessage(`Selected section: ${updCategoryId.trim()}.`),
      ],
    });
    return handleUpdateCarrierCategorySubmit(
      sessionId,
      getSession(sessionId),
      updCategoryId.trim(),
    );
  }

  const updCode = input.updateCarrierCode;
  if (
    typeof updCode === "string" &&
    updCode.trim() &&
    session.currentWorkflowId === "update_carrier" &&
    session.updateCarrierUiPhase === "need_code"
  ) {
    const c = updCode.trim();
    session = updateSession(sessionId, {
      appendToHistory: [userMessage(`Entered carrier code ${c.toUpperCase()}.`)],
    });
    return handleUpdateCarrierCodeSubmit(sessionId, c);
  }

  if (session.conversationHistory.length === 0 && !text) {
    const greeting = "";
    session = updateSession(sessionId, {
      appendToHistory: [assistantMessage(greeting)],
    });
    return composeBody(session, {
      responseType: "greeting",
      message: greeting,
      summaryCard: { actions: MAIN_MENU_ACTIONS },
      awaitingConfirmation: false,
    });
  }

  if (!text) {
    const msg = "Type a message to continue.";
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

  if (wantsMainMenu(text)) {
    const { message: menuMsg, summaryCard } = buildMainMenuAssistantReply();
    session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [assistantMessage(menuMsg)],
    });
    return composeBody(session, {
      responseType: "greeting",
      message: menuMsg,
      summaryCard,
      awaitingConfirmation: false,
    });
  }

  if (wantsReset(text)) {
    session = updateSession(sessionId, {
      ...WORKFLOW_RESET,
      appendToHistory: [
        assistantMessage("Starting fresh. What next?"),
      ],
    });
    return composeBody(session, {
      responseType: "needs_input",
      message: "Starting fresh. What next?",
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
