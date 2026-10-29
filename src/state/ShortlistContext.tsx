import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "./storage";

const STORAGE_KEY = "influencer-ai:shortlist:v1";

export interface ShortlistContextValue {
  /** Creator ids in the order they were added. May contain ids unknown to the current dataset. */
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  /** Replaces the whole shortlist, e.g. with an optimised plan. */
  replace: (ids: string[]) => void;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

function loadIds(): string[] {
  const stored = readJSON<unknown>(STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
}

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(loadIds);

  useEffect(() => {
    writeJSON(STORAGE_KEY, ids);
  }, [ids]);

  const add = useCallback((id: string) => setIds((current) => (current.includes(id) ? current : [...current, id])), []);
  const remove = useCallback((id: string) => setIds((current) => current.filter((x) => x !== id)), []);
  const toggle = useCallback(
    (id: string) => setIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id])),
    [],
  );
  const clear = useCallback(() => setIds([]), []);
  const replace = useCallback((next: string[]) => setIds([...new Set(next)]), []);

  const value = useMemo<ShortlistContextValue>(() => {
    const set = new Set(ids);
    return { ids, count: ids.length, has: (id) => set.has(id), add, remove, toggle, clear, replace };
  }, [ids, add, remove, toggle, clear, replace]);

  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

export function useShortlist(): ShortlistContextValue {
  const context = useContext(ShortlistContext);
  if (!context) throw new Error("useShortlist must be used inside <ShortlistProvider>");
  return context;
}
