import "server-only";

import type { ChatMessage } from "@/types/chat";

export type WorkflowPhase = "idle" | "collecting" | "confirming";

/**
 * Server-only MVP session: one object per `sessionId` (e.g. cookie value).
 * Not shared across instances or restarts.
 */
export type AssistantSessionState = {
  sessionId: string;
  conversationHistory: ChatMessage[];
  /** `WorkflowDefinition.id` from `lib/workflows`, or null when idle */
  currentWorkflowId: string | null;
  phase: WorkflowPhase;
  step: number;
  collectedParams: Record<string, unknown>;
  /** Required field keys still needed for the active workflow */
  missingFieldKeys: string[];
  awaitingConfirmation: boolean;
  pendingFieldKey: string | null;
  /** Ordered optional field keys (e.g. update carrier flow) */
  optionalFieldQueue: string[];
  /**
   * Create-draft only: after full validation failed (form shown), next merge skips
   * re-asking optional fields and goes straight to confirm-or-form again.
   */
  createCarrierSkipOptionalWalkthrough: boolean;
  /** Create-draft: collect everything via the panel form instead of chat Q&A. */
  createCarrierFormFirst: boolean;
  /**
   * Update-carrier form flow: code → category picker → section form.
   * `none` when not in that UI or after reset.
   */
  updateCarrierUiPhase:
    | "none"
    | "need_code"
    | "pick_category"
    | "multi_section_form"
    | "section_form"
    | "section_confirm";
  updatedAt: number;
};

export type SessionPatch = {
  conversationHistory?: ChatMessage[];
  /** Appended after any `conversationHistory` replace */
  appendToHistory?: ChatMessage[];
  currentWorkflowId?: string | null;
  phase?: WorkflowPhase;
  step?: number;
  /** When set, replaces `collectedParams` entirely (so removed keys are not kept). */
  collectedParams?: Record<string, unknown>;
  missingFieldKeys?: string[];
  awaitingConfirmation?: boolean;
  pendingFieldKey?: string | null;
  optionalFieldQueue?: string[];
  createCarrierSkipOptionalWalkthrough?: boolean;
  createCarrierFormFirst?: boolean;
  updateCarrierUiPhase?: AssistantSessionState["updateCarrierUiPhase"];
};

const DEFAULT_MAX_SESSIONS = 10_000;

const sessions = new Map<string, AssistantSessionState>();

function timestamp(): number {
  return Date.now();
}

function assertSessionId(sessionId: string): string {
  const id = sessionId.trim();
  if (!id) {
    throw new Error("sessionId is required");
  }
  return id;
}

export function createInitialSessionState(sessionId: string): AssistantSessionState {
  const id = assertSessionId(sessionId);
  return {
    sessionId: id,
    conversationHistory: [],
    currentWorkflowId: null,
    phase: "idle",
    step: 0,
    collectedParams: {},
    missingFieldKeys: [],
    awaitingConfirmation: false,
    pendingFieldKey: null,
    optionalFieldQueue: [],
    createCarrierSkipOptionalWalkthrough: false,
    createCarrierFormFirst: false,
    updateCarrierUiPhase: "none",
    updatedAt: timestamp(),
  };
}

function evictOldestIfOverLimit(maxSessions: number): void {
  if (sessions.size < maxSessions) return;
  let oldestId: string | null = null;
  let oldestT = Infinity;
  for (const [id, s] of sessions) {
    if (s.updatedAt < oldestT) {
      oldestT = s.updatedAt;
      oldestId = id;
    }
  }
  if (oldestId) sessions.delete(oldestId);
}

/**
 * Returns existing session or creates a new one (and stores it).
 */
export function getSession(sessionId: string): AssistantSessionState {
  const id = assertSessionId(sessionId);
  let s = sessions.get(id);
  if (!s) {
    evictOldestIfOverLimit(
      Number(process.env.SESSION_STORE_MAX ?? DEFAULT_MAX_SESSIONS) || DEFAULT_MAX_SESSIONS,
    );
    s = createInitialSessionState(id);
    sessions.set(id, s);
  }
  return s;
}

function cloneState(state: AssistantSessionState): AssistantSessionState {
  return {
    ...state,
    conversationHistory: [...state.conversationHistory],
    collectedParams: { ...state.collectedParams },
    missingFieldKeys: [...state.missingFieldKeys],
    optionalFieldQueue: [...state.optionalFieldQueue],
    createCarrierSkipOptionalWalkthrough: state.createCarrierSkipOptionalWalkthrough,
    createCarrierFormFirst: state.createCarrierFormFirst ?? false,
    updateCarrierUiPhase: state.updateCarrierUiPhase ?? "none",
  };
}

/**
 * Applies a patch with merge rules:
 * - `collectedParams` replaces the previous map when provided (shallow copy)
 * - `appendToHistory` appends after optional `conversationHistory` replace
 */
export function updateSession(
  sessionId: string,
  patch: SessionPatch,
): AssistantSessionState {
  const id = assertSessionId(sessionId);
  const prev = getSession(id);
  const next = cloneState(prev);

  if (patch.conversationHistory !== undefined) {
    next.conversationHistory = [...patch.conversationHistory];
  }
  if (patch.appendToHistory?.length) {
    next.conversationHistory = [
      ...next.conversationHistory,
      ...patch.appendToHistory,
    ];
  }
  if (patch.currentWorkflowId !== undefined) {
    next.currentWorkflowId = patch.currentWorkflowId;
  }
  if (patch.phase !== undefined) {
    next.phase = patch.phase;
  }
  if (patch.step !== undefined) {
    next.step = patch.step;
  }
  if (patch.collectedParams !== undefined) {
    next.collectedParams = { ...patch.collectedParams };
  }
  if (patch.missingFieldKeys !== undefined) {
    next.missingFieldKeys = [...patch.missingFieldKeys];
  }
  if (patch.awaitingConfirmation !== undefined) {
    next.awaitingConfirmation = patch.awaitingConfirmation;
  }
  if (patch.pendingFieldKey !== undefined) {
    next.pendingFieldKey = patch.pendingFieldKey;
  }
  if (patch.optionalFieldQueue !== undefined) {
    next.optionalFieldQueue = [...patch.optionalFieldQueue];
  }
  if (patch.createCarrierSkipOptionalWalkthrough !== undefined) {
    next.createCarrierSkipOptionalWalkthrough =
      patch.createCarrierSkipOptionalWalkthrough;
  }
  if (patch.createCarrierFormFirst !== undefined) {
    next.createCarrierFormFirst = patch.createCarrierFormFirst;
  }
  if (patch.updateCarrierUiPhase !== undefined) {
    next.updateCarrierUiPhase = patch.updateCarrierUiPhase;
  }

  next.updatedAt = timestamp();
  sessions.set(id, next);
  return next;
}

/** Removes the session; next `getSession` starts fresh. */
export function clearSession(sessionId: string): void {
  const id = assertSessionId(sessionId);
  sessions.delete(id);
}

/** Test / admin hook — not for hot paths */
export function sessionCount(): number {
  return sessions.size;
}
