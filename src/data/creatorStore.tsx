// The app's creator data, loaded from the API at boot.
//
// This replaces the generated demo dataset that used to be imported synchronously and bundled into
// the client. Real creators live in Postgres and arrive over /api/creators, so every consumer now
// has to cope with loading, an empty database and a failed request — which is honest, because any
// of those can happen.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Creator } from "@/types";

export type CreatorsStatus = "loading" | "ready" | "empty" | "error";

export interface CreatorStore {
  creators: Creator[];
  getCreatorById: (id: string) => Creator | undefined;
  status: CreatorsStatus;
  /** Present when status is "error". */
  error?: string;
  /** When the oldest loaded record was fetched from the platform. */
  fetchedAt?: string;
  reload: () => void;
}

const EMPTY: CreatorStore = {
  creators: [],
  getCreatorById: () => undefined,
  status: "loading",
  reload: () => {},
};

const CreatorContext = createContext<CreatorStore>(EMPTY);

interface ApiRecord {
  creator: Creator;
  source?: { fetchedAt?: string };
}

export function CreatorProvider({ children, limit = 2000 }: { children: ReactNode; limit?: number }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [status, setStatus] = useState<CreatorsStatus>("loading");
  const [error, setError] = useState<string>();
  const [fetchedAt, setFetchedAt] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError(undefined);

    fetch(`/api/creators?limit=${limit}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
          throw new Error(body.message ?? body.error ?? `Request failed with status ${response.status}`);
        }
        return (await response.json()) as { creators: ApiRecord[] };
      })
      .then((body) => {
        const records = body.creators ?? [];
        setCreators(records.map((record) => record.creator));
        setFetchedAt(records.map((r) => r.source?.fetchedAt).filter(Boolean).sort()[0]);
        setStatus(records.length === 0 ? "empty" : "ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load creators.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [limit, attempt]);

  const value = useMemo<CreatorStore>(() => {
    const byId = new Map(creators.map((creator) => [creator.id, creator]));
    return {
      creators,
      getCreatorById: (id: string) => byId.get(id),
      status,
      error,
      fetchedAt,
      reload: () => setAttempt((n) => n + 1),
    };
  }, [creators, status, error, fetchedAt]);

  return <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>;
}

export function useCreators(): CreatorStore {
  return useContext(CreatorContext);
}
