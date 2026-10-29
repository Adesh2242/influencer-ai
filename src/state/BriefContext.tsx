import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_BRIEF, mergeBrief } from "@/lib/brief/defaults";
import type { CampaignBrief, ParsedBrief } from "@/types";
import { readJSON, writeJSON } from "./storage";

const STORAGE_KEY = "influencer-ai:brief:v1";

interface StoredBrief {
  brief: CampaignBrief;
  briefText: string;
  lastParse: Pick<ParsedBrief, "source" | "notes"> | null;
}

export interface BriefContextValue {
  /** The structured brief that drives matching. */
  brief: CampaignBrief;
  setBrief: (brief: CampaignBrief) => void;
  updateBrief: (patch: Partial<CampaignBrief>) => void;
  /** The free-text description the user typed or pasted. */
  briefText: string;
  setBriefText: (text: string) => void;
  /** Source and notes of the last parse, to show what the parser assumed. */
  lastParse: Pick<ParsedBrief, "source" | "notes"> | null;
  setLastParse: (parse: Pick<ParsedBrief, "source" | "notes"> | null) => void;
  resetBrief: () => void;
}

const BriefContext = createContext<BriefContextValue | null>(null);

function loadStored(): StoredBrief {
  const stored = readJSON<Partial<StoredBrief>>(STORAGE_KEY);
  return {
    // Merge over the defaults so briefs saved by older builds gain any newly added fields.
    brief: stored?.brief && typeof stored.brief === "object" ? mergeBrief(DEFAULT_BRIEF, stored.brief) : DEFAULT_BRIEF,
    briefText: typeof stored?.briefText === "string" ? stored.briefText : "",
    lastParse: stored?.lastParse ?? null,
  };
}

export function BriefProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredBrief>(loadStored);

  useEffect(() => {
    writeJSON(STORAGE_KEY, state);
  }, [state]);

  const setBrief = useCallback((brief: CampaignBrief) => setState((s) => ({ ...s, brief })), []);
  const updateBrief = useCallback((patch: Partial<CampaignBrief>) => setState((s) => ({ ...s, brief: mergeBrief(s.brief, patch) })), []);
  const setBriefText = useCallback((briefText: string) => setState((s) => ({ ...s, briefText })), []);
  const setLastParse = useCallback((lastParse: StoredBrief["lastParse"]) => setState((s) => ({ ...s, lastParse })), []);
  const resetBrief = useCallback(() => setState({ brief: DEFAULT_BRIEF, briefText: "", lastParse: null }), []);

  const value = useMemo<BriefContextValue>(
    () => ({ ...state, setBrief, updateBrief, setBriefText, setLastParse, resetBrief }),
    [state, setBrief, updateBrief, setBriefText, setLastParse, resetBrief],
  );

  return <BriefContext.Provider value={value}>{children}</BriefContext.Provider>;
}

export function useBrief(): BriefContextValue {
  const context = useContext(BriefContext);
  if (!context) throw new Error("useBrief must be used inside <BriefProvider>");
  return context;
}
