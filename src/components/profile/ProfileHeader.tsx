import { ArrowLeft, Bookmark, BookmarkCheck, CalendarDays, MailPlus, ReceiptIndianRupee } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { CreatorIdentity, TierBadge } from "@/components/creators/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LANGUAGES, NICHE_LABELS } from "@/data/taxonomy";
import { useShortlist } from "@/state/ShortlistContext";
import type { Creator } from "@/types";
import { formatMembership } from "./helpers";

/** Goes back in history when the user arrived from inside the app, otherwise to /discover. */
export function BackLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasHistory = location.key !== "default";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hasHistory) return;
    event.preventDefault();
    void navigate(-1);
  }

  return (
    <Link
      to="/discover"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {hasHistory ? "Back" : "Browse all creators"}
    </Link>
  );
}

export function ProfileHeader({ creator, onDraftOutreach }: { creator: Creator; onDraftOutreach: () => void }) {
  const shortlist = useShortlist();
  const saved = shortlist.has(creator.id);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <CreatorIdentity creator={creator} size="xl" linkToProfile={false} nameAs="h1" />
          <p className="max-w-2xl text-sm leading-relaxed text-slate-700">{creator.bio}</p>

          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={creator.tier} />
            {creator.niches.map((niche, index) => (
              <Badge key={niche} tone={index === 0 ? "accent" : "neutral"}>
                {NICHE_LABELS[niche]}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span>
              <span className="font-medium text-slate-800">Creates in </span>
              {creator.languages.map((code, index) => (
                <span key={code}>
                  {index > 0 ? ", " : null}
                  {LANGUAGES[code].label}
                  {LANGUAGES[code].native !== LANGUAGES[code].label ? (
                    <span lang={code} className="text-slate-500">
                      {" "}
                      ({LANGUAGES[code].native})
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {creator.verified ? <Badge tone="success">Verified creator</Badge> : <Badge>Not verified</Badge>}
            {creator.gstRegistered ? (
              <Badge tone="info">
                <ReceiptIndianRupee className="size-3" aria-hidden="true" />
                GST registered
              </Badge>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatMembership(creator.joinedMonthsAgo)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
          <Button
            variant={saved ? "secondary" : "primary"}
            aria-pressed={saved}
            onClick={() => shortlist.toggle(creator.id)}
          >
            {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
            {saved ? "Shortlisted" : "Add to shortlist"}
          </Button>
          <Button variant="outline" onClick={onDraftOutreach}>
            <MailPlus className="size-4" aria-hidden="true" />
            Draft outreach
          </Button>
        </div>
      </div>
    </Card>
  );
}
