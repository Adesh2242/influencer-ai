import { BadgeCheck, Briefcase, Camera, MapPin, MessageCircle, Music2, Play, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/misc";
import { Meter } from "@/components/ui/Score";
import { CREATOR_TIERS, getCity, PLATFORMS } from "@/data/taxonomy";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Creator, CreatorTier, Platform, PlatformStats, ScoreComponent } from "@/types";

// lucide no longer ships brand logos, so platforms get neutral glyphs plus their name.
const platformIcons: Record<Platform, LucideIcon> = {
  instagram: Camera,
  youtube: Play,
  moj: Music2,
  sharechat: MessageCircle,
  linkedin: Briefcase,
};

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const Icon = platformIcons[platform];
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}

/** "Instagram 48.2K" chip. */
export function PlatformBadge({ stats, className }: { stats: PlatformStats; className?: string }) {
  const label = PLATFORMS[stats.platform].label;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700", className)}
      title={`${label}: ${stats.followers.toLocaleString("en-IN")} followers`}
    >
      <PlatformIcon platform={stats.platform} className="size-3.5" />
      <span className="sr-only">{label}</span>
      <span className="tabular-nums">{formatCount(stats.followers)}</span>
    </span>
  );
}

export function TierBadge({ tier, className }: { tier: CreatorTier; className?: string }) {
  return (
    <Badge tone="brand" className={className}>
      {CREATOR_TIERS[tier].label}
    </Badge>
  );
}

export interface CreatorIdentityProps {
  creator: Creator;
  size?: "sm" | "md" | "lg" | "xl";
  /** Links the name to the creator's profile page. */
  linkToProfile?: boolean;
  /** Renders an unlinked name as the page heading (the profile page's <h1>). */
  nameAs?: "span" | "h1";
  className?: string;
}

/** Avatar, name, verified tick, @handle and home city. */
export function CreatorIdentity({ creator, size = "md", linkToProfile = true, nameAs = "span", className }: CreatorIdentityProps) {
  const NameTag = nameAs;
  const home = getCity(creator.homeCityId);
  const nameClass = cn(
    "font-semibold text-slate-900",
    size === "xl" ? "text-2xl" : size === "lg" ? "text-lg" : "text-sm",
    linkToProfile && "hover:text-brand-700 hover:underline",
  );

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar name={creator.name} hue={creator.avatarHue} size={size} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          {linkToProfile ? (
            <Link to={`/creators/${creator.id}`} className={cn(nameClass, "truncate")}>
              {creator.name}
            </Link>
          ) : (
            <NameTag className={cn(nameClass, "truncate")}>{creator.name}</NameTag>
          )}
          {creator.verified ? (
            <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verified creator" role="img" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className="truncate">@{creator.handle}</span>
          {home ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="size-3" aria-hidden="true" />
              {home.name}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One meter per score component; components the brief did not ask for are shown as "No preference". */
export function ScoreBreakdown({ components, className }: { components: ScoreComponent[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {components.map((component) => (
        <li key={component.key} className={cn(!component.applied && "opacity-60")}>
          <Meter
            value={component.score}
            label={
              <>
                <span className="font-medium text-slate-800">{component.label}</span>
                <span className="text-slate-400">
                  {" · "}
                  {component.applied ? `${Math.round(component.weight * 100)}% weight` : "No preference"}
                </span>
              </>
            }
            valueLabel={Math.round(component.score)}
            tone={component.applied ? undefined : "neutral"}
          />
          <p className="mt-1 text-xs text-slate-500">{component.detail}</p>
        </li>
      ))}
    </ul>
  );
}
