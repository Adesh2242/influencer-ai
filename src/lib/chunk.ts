// Recovering from a deploy that lands under an open tab.
//
// Code is split into chunks named by content hash, so every deploy renames all of them. A tab
// opened beforehand still asks for the old filename and gets nothing back. Where that import sits
// inside React.lazy the route renders a blank white page; where it sits inside a click handler the
// handler throws and the UI reports a failure that has nothing to do with what the user did — a
// correctly written brief came back as "We couldn't read that brief".
//
// Reloading picks up the new index.html and fixes both, so do it once, automatically. The flag
// means a genuinely broken build fails visibly instead of reloading forever.
const RELOAD_FLAG = "chunk-reload";

function canReload(): boolean {
  try {
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") return false;
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    return true;
  } catch {
    // Private mode, or storage blocked: better to surface the error than to reload blindly.
    return false;
  }
}

/** Clears the guard once the app has rendered, so a later deploy can recover too. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage?.removeItem(RELOAD_FLAG);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Runs a dynamic import, reloading the page once if the chunk has gone. The returned promise never
 * resolves in that case: the reload takes over before anything can render.
 */
export function importChunk<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((error: unknown) => {
    if (canReload()) {
      window.location.reload();
      return new Promise<T>(() => {});
    }
    throw error;
  });
}
