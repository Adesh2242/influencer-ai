import { UserX } from "lucide-react";
import { useMemo, useRef } from "react";
import { useParams } from "react-router";
import { AudienceSection } from "@/components/profile/AudienceSection";
import { BriefFitSection } from "@/components/profile/BriefFitSection";
import { hasTargeting, similarCreators } from "@/components/profile/helpers";
import { OutreachSection } from "@/components/profile/OutreachSection";
import { BackLink, ProfileHeader } from "@/components/profile/ProfileHeader";
import { CollaborationsSection, PlatformStatsSection, RateCardSection } from "@/components/profile/ProfileStats";
import { SimilarCreators } from "@/components/profile/SimilarCreators";
import { TrustSection } from "@/components/profile/TrustSection";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";
import { SITE } from "@/config/site";
import { creators, getCreatorById } from "@/data/creators";
import { scoreCreator } from "@/lib/matching/engine";
import { useBrief } from "@/state/BriefContext";
import type { Creator } from "@/types";

export default function CreatorPage() {
  const { id = "" } = useParams();
  const creator = getCreatorById(id);

  if (!creator) {
    return (
      <div className="container-page py-12">
        <title>{"Creator not found · " + SITE.name}</title>
        <h1 className="sr-only">Creator not found</h1>
        <EmptyState
          icon={UserX}
          title="We couldn't find that creator"
          description="The link may be out of date, or the profile is no longer in the demo dataset."
          action={<ButtonLink to="/discover">Browse all creators</ButtonLink>}
        />
      </div>
    );
  }

  // Keyed by id so per-profile state (outreach toggles, copy status) resets between profiles.
  return <CreatorProfile key={creator.id} creator={creator} />;
}

function CreatorProfile({ creator }: { creator: Creator }) {
  const { brief } = useBrief();
  const outreachHeading = useRef<HTMLHeadingElement>(null);

  const estimate = useMemo(() => scoreCreator(brief, creator), [brief, creator]);
  const targeted = hasTargeting(brief);
  const similar = useMemo(() => similarCreators(creator, creators, 4), [creator]);

  function scrollToOutreach() {
    const heading = outreachHeading.current;
    if (!heading) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.closest("#outreach")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }

  return (
    <div className="container-page space-y-6 py-6 sm:py-8">
      <title>{`${creator.name} (@${creator.handle}) · ${SITE.name}`}</title>
      <BackLink />
      <ProfileHeader creator={creator} onDraftOutreach={scrollToOutreach} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <PlatformStatsSection creator={creator} />
          <BriefFitSection brief={brief} result={targeted ? estimate : null} />
          <AudienceSection creator={creator} />
          <OutreachSection ref={outreachHeading} creator={creator} brief={brief} estimate={estimate} />
        </div>
        <div className="min-w-0 space-y-6">
          <TrustSection creator={creator} />
          <RateCardSection creator={creator} />
          <CollaborationsSection creator={creator} />
        </div>
      </div>

      <SimilarCreators creator={creator} similar={similar} />

      <p className="text-xs text-slate-500">
        Demo profile: {creator.name} is a fictional creator, and every figure on this page is generated sample data.
      </p>
    </div>
  );
}
