import { Check, Copy } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/misc";
import { buildOutreachMessage, type OutreachChannel, type OutreachLanguage } from "@/lib/outreach";
import type { CampaignBrief, Creator, MatchResult } from "@/types";
import { copyText } from "./clipboard";

const LANGUAGE_TABS = [
  { value: "en", label: "English" },
  { value: "hinglish", label: "Hinglish" },
] as const satisfies readonly { value: OutreachLanguage; label: string }[];

const CHANNEL_TABS = [
  { value: "email", label: "Email" },
  { value: "dm", label: "DM" },
] as const satisfies readonly { value: OutreachChannel; label: string }[];

type CopyStatus = "idle" | "copied" | "failed";

export interface OutreachSectionProps {
  creator: Creator;
  brief: CampaignBrief;
  estimate: MatchResult;
}

/** Draft first-contact message. The heading receives focus when "Draft outreach" scrolls here. */
export const OutreachSection = forwardRef<HTMLHeadingElement, OutreachSectionProps>(function OutreachSection(
  { creator, brief, estimate },
  headingRef,
) {
  const [language, setLanguage] = useState<OutreachLanguage>("en");
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  const message = useMemo(
    () => buildOutreachMessage({ creator, brief, estimate, language, channel }),
    [creator, brief, estimate, language, channel],
  );
  const fullText = message.subject ? `Subject: ${message.subject}\n\n${message.body}` : message.body;

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function handleCopy() {
    const copied = await copyText(fullText);
    setStatus(copied ? "copied" : "failed");
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <Card id="outreach" className="scroll-mt-24">
      <CardHeader>
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-none">
          Draft outreach
        </h2>
        <CardDescription>
          A first message built from this profile and your brief. Review it before sending.
          {brief.brandName.trim() ? null : (
            <>
              {" "}
              <Link to="/match" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                Add your brand name
              </Link>{" "}
              to personalise it further.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Tabs tabs={LANGUAGE_TABS} value={language} onChange={setLanguage} label="Message language" />
          <Tabs tabs={CHANNEL_TABS} value={channel} onChange={setChannel} label="Channel" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50" aria-label="Message preview" role="region">
          {message.subject ? (
            <p className="border-b border-slate-200 px-4 py-3 text-sm">
              <span className="font-medium text-slate-500">Subject: </span>
              <span className="font-semibold text-slate-900">{message.subject}</span>
            </p>
          ) : null}
          <p className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed text-slate-800">{message.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleCopy()}>
            {status === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {status === "copied" ? "Copied" : channel === "email" ? "Copy email" : "Copy message"}
          </Button>
          <p role="status" aria-live="polite" className="text-sm text-slate-600">
            {status === "copied"
              ? "Copied to your clipboard."
              : status === "failed"
                ? "Couldn't copy automatically. Select the text above and copy it."
                : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
