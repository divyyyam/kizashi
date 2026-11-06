const STORAGE_KEY = "kizashi.sidebar.collapsed";

const listeners = new Set<() => void>();

// The value set during this page view; wins over storage so the toggle works when storage is blocked.
let current: boolean | undefined;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Storage can be blocked (private mode, policy); the sidebar then starts expanded.
    return false;
  }
}

export function subscribeCollapsed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const collapsedSnapshot = (): boolean => current ?? readStored();

/** The server always renders the expanded sidebar; the client corrects it before paint. */
export const collapsedServerSnapshot = (): boolean => false;

export function setCollapsed(next: boolean): void {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Not persisted; `current` still applies it for this page view.
  }
  for (const listener of listeners) listener();
}
