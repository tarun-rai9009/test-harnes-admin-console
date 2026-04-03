const STORAGE_KEY = "carrier-ops-chat-session";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    let id = window.sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
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
