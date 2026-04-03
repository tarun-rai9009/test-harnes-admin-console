/**
 * In-memory server-side session store (MVP). Not durable across deploys or instances.
 */

export {
  clearSession,
  createInitialSessionState,
  getSession,
  sessionCount,
  updateSession,
  type AssistantSessionState,
  type SessionPatch,
  type WorkflowPhase,
} from "./store";
