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
  updatedAt: number;
};

export type SessionPatch = {
  conversationHistory?: ChatMessage[];
  /** Appended after any `conversationHistory` replace */
  appendToHistory?: ChatMessage[];
  currentWorkflowId?: string | null;
  phase?: WorkflowPhase;
  step?: number;
  /** Shallow-merged into existing `collectedParams` */
  collectedParams?: Record<string, unknown>;
  missingFieldKeys?: string[];
  awaitingConfirmation?: boolean;
  pendingFieldKey?: string | null;
  optionalFieldQueue?: string[];
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
  };
}

/**
 * Applies a patch with merge rules:
 * - `collectedParams` shallow-merges into previous
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
    next.collectedParams = {
      ...next.collectedParams,
      ...patch.collectedParams,
    };
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
