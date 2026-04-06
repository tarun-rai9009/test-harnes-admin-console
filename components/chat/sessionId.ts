const STORAGE_KEY = "carrier-ops-chat-session";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const id = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

export function rotateSessionId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }
  const id = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}
