import {
  Activity,
  ArrowRight,
  Ban,
  Bot,
  Clapperboard,
  FlaskConical,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/Layout";
import { formatWeight, scoreKeys, weightShares } from "@/components/marketing/weights";
import { followerRangeLabel, tierName } from "@/components/marketing/options";
import { joinWithAnd } from "@/components/marketing/text";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import { CREATOR_TIER_LIST } from "@/data/taxonomy";
import { DEFAULT_BRIEF } from "@/lib/brief/defaults";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { DEFAULT_WEIGHTS, SCORE_LABELS } from "@/lib/matching/engine";
import { cn } from "@/lib/utils";
import type { ScoreKey } from "@/types";

const SECTIONS = {
  score: "The match score",
  "open-criteria": "Criteria you leave open",
  "hard-filters": "Hard filters",
  estimates: "Reach, cost, CPM and CPE",
  authenticity: "Authenticity signals",
  optimiser: "The budget optimiser",
  "brief-parsing": "AI brief parsing",
  data: "Data, privacy and disclosure",
  limitations: "Limitations",
} as const;

type SectionId = keyof typeof SECTIONS;

const SCORE_KEYS = scoreKeys(DEFAULT_WEIGHTS);
const DEFAULT_SHARES = weightShares(DEFAULT_WEIGHTS);
const MAX_SHARE = Math.max(...SCORE_KEYS.map((key) => DEFAULT_SHARES[key] ?? 0));

/** "Geography and budget fit": labels joined for use as the subject of a sentence. */
function labelList(keys: readonly ScoreKey[]): string {
  return joinWithAnd(keys.map((key, index) => (index === 0 ? SCORE_LABELS[key] : SCORE_LABELS[key].toLowerCase())));
}

/** skippedWhen is null for components that describe the creator rather than the brief: they always count. */
const COMPONENT_DETAILS: Record<ScoreKey, { measures: string; skippedWhen: string | null }> = {
  niche: {
    measures: "How well the creator's niches and content topics match the niches and product described in your brief.",
    skippedWhen: "the brief names no niche.",
  },
  audience: {
    measures: "How much of the creator's audience matches the gender and age bands you're targeting.",
    skippedWhen: "gender is set to Any and no age bands are chosen.",
  },
  language: {
    measures: "Whether the creator makes content in your target languages, and how much of their audience speaks them.",
    skippedWhen: "no languages are chosen.",
  },
  geo: {
    measures: "The share of the creator's audience living in the city tiers, regions and cities you're targeting.",
    skippedWhen: "no tiers, regions or cities are chosen.",
  },
  engagement: {
    measures:
      "The creator's engagement rate compared with the typical rate for their size tier, so a nano creator is never judged against a mega creator.",
    skippedWhen: null,
  },
  authenticity: {
    measures: "How much of the creator's audience looks real and active, from their audience authenticity score.",
    skippedWhen: null,
  },
  budget: {
    measures: "How the creator's estimated fee compares with your budget per creator: the total budget divided by the number of creators you want.",
    skippedWhen: "no budget is set.",
  },
  platform: {
    measures: "How strong the creator's presence is on the platforms in your brief.",
    skippedWhen: "no platforms are chosen.",
  },
};

const ALWAYS_APPLIED = SCORE_KEYS.filter((key) => COMPONENT_DETAILS[key].skippedWhen === null);

// Worked example for re-normalisation: a pan-India brief without a budget yet.
const EXAMPLE_SKIPPED: ScoreKey[] = ["geo", "budget"];
const EXAMPLE_SHARES = weightShares(DEFAULT_WEIGHTS, EXAMPLE_SKIPPED);

// Worked example for the cost metrics; the numbers are illustrative, the arithmetic is live.
const EXAMPLE_COST = 48_000;
const EXAMPLE_VIEWS = 160_000;
const EXAMPLE_ENGAGEMENTS = 4_800;

const HARD_FILTERS: { icon: LucideIcon; title: string; description: ReactNode }[] = [
  {
    icon: Smartphone,
    title: "Platform availability",
    description: "The creator must be active on at least one of the platforms in your brief.",
  },
  {
    icon: ShieldCheck,
    title: "Minimum authenticity",
    description: `Creators whose authenticity score is below your minimum are excluded. The default minimum is ${DEFAULT_BRIEF.minAuthenticity} out of 100.`,
  },
  {
    icon: Activity,
    title: "Minimum engagement",
    description:
      DEFAULT_BRIEF.minEngagementRate > 0
        ? `Creators whose engagement rate is below your minimum are excluded. The default minimum is ${formatPercent(DEFAULT_BRIEF.minEngagementRate)}.`
        : "If you set a minimum engagement rate, creators below it are excluded. There is no minimum by default.",
  },
  {
    icon: Users,
    title: "Creator size",
    description: `If you pick size tiers, from ${tierName(CREATOR_TIER_LIST[0])} (${followerRangeLabel(CREATOR_TIER_LIST[0])} followers) to ${tierName(CREATOR_TIER_LIST[CREATOR_TIER_LIST.length - 1])} (${followerRangeLabel(CREATOR_TIER_LIST[CREATOR_TIER_LIST.length - 1])}), creators in other tiers are excluded.`,
  },
  {
    icon: Ban,
    title: "Competitor work in the last 6 months",
    description:
      "Creators who worked with a brand on your exclusion list in the last six months are excluded, so your campaign doesn't sit next to a rival's.",
  },
  {
    icon: Clapperboard,
    title: "Deliverable support",
    description:
      "The creator needs a platform that supports the format you chose: a story needs Instagram, for example, and a YouTube integration needs a YouTube channel.",
  },
];

const LIMITATIONS: { title: string; description: string }[] = [
  {
    title: "The data is fictional.",
    description: "Rankings here demonstrate the method. They say nothing about real creators or real market rates.",
  },
  {
    title: "Estimates are not quotes.",
    description:
      "Fees, reach and engagement are planning heuristics. Real rates depend on the creator, the format, usage rights, exclusivity and timing.",
  },
  {
    title: "Reach is added up, not de-duplicated.",
    description: "Plan totals sum each creator's estimated views, so people who follow several of your creators are counted more than once.",
  },
  {
    title: "The score only sees what's in the brief.",
    description:
      "It can't judge creative quality, tone of voice, cultural nuance or whether a creator's values suit your brand. That still needs a human look.",
  },
  {
    title: "Audience data is never perfect.",
    description: "Even from official APIs, demographics are platform estimates, and no authenticity check catches every fake account.",
  },
  {
    title: "AI can misread a brief.",
    description: "Check the parsed filters before trusting the ranking, especially budgets, locations and competitor names.",
  },
  {
    title: "The default weights are a judgement call.",
    description: "They reflect common planning priorities, which may not match yours for a particular campaign.",
  },
  {
    title: "A good match isn't a yes.",
    description: "The ranking doesn't know whether a creator is available, interested in your category or already committed elsewhere.",
  },
];

function MethodSection({ id, intro, children }: { id: SectionId; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-slate-900">
        {SECTIONS[id]}
      </h2>
      {intro ? <p className="mt-3 text-base leading-relaxed text-slate-600">{intro}</p> : null}
      {children ? <div className="mt-6 space-y-6">{children}</div> : null}
    </section>
  );
}

function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("space-y-4 text-base leading-relaxed text-slate-600", className)}>{children}</div>;
}

function ScoreComponentList() {
  return (
    <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-card">
      {SCORE_KEYS.map((key) => {
        const share = DEFAULT_SHARES[key] ?? 0;
        const { measures, skippedWhen } = COMPONENT_DETAILS[key];
        return (
          <li key={key} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{SCORE_LABELS[key]}</h3>
                <p className="text-sm font-semibold tabular-nums text-brand-700">
                  <span className="sr-only">Default weight: </span>
                  {formatWeight(share)}
                </p>
              </div>
              <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${MAX_SHARE > 0 ? (share / MAX_SHARE) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="space-y-2 text-sm leading-relaxed">
              <p className="text-slate-600">{measures}</p>
              <p className="text-slate-500">
                {skippedWhen === null ? (
                  <span className="font-semibold text-slate-700">Always counts.</span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-700">Skipped when</span> {skippedWhen}
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RenormalisationExample() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="font-semibold text-slate-900">Example: a pan-India brief with no budget set yet</h3>
        <p className="mt-1 text-sm text-slate-500">
          {labelList(EXAMPLE_SKIPPED)} are skipped, and the other weights are scaled up to fill their share.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Default weights compared with the weights applied to the example brief</caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-2.5">
                Component
              </th>
              <th scope="col" className="px-5 py-2.5 text-right">
                Default
              </th>
              <th scope="col" className="px-5 py-2.5 text-right">
                This brief
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SCORE_KEYS.map((key) => {
              const applied = EXAMPLE_SHARES[key];
              return (
                <tr key={key}>
                  <th scope="row" className="px-5 py-2.5 font-medium text-slate-800">
                    {SCORE_LABELS[key]}
                  </th>
                  <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{formatWeight(DEFAULT_SHARES[key] ?? 0)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {applied === null ? (
                      <span className="text-slate-500">Skipped</span>
                    ) : (
                      <span className="font-semibold text-slate-900">{formatWeight(applied)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 font-semibold text-slate-900">
            <tr>
              <th scope="row" className="px-5 py-2.5">
                Total
              </th>
              <td className="px-5 py-2.5 text-right tabular-nums">100%</td>
              <td className="px-5 py-2.5 text-right tabular-nums">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="font-semibold text-slate-900">{term}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-slate-600">{children}</dd>
    </div>
  );
}

function IconBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Card className="flex gap-4 p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="mt-1 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
    </Card>
  );
}

function TableOfContents() {
  return (
    <nav
      aria-label="On this page"
      className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24 lg:self-start lg:border-0 lg:bg-transparent lg:p-0"
    >
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
      <ol className="mt-2 grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
        {(Object.keys(SECTIONS) as SectionId[]).map((id) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {SECTIONS[id]}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function MethodologyPage() {
  const cpm = (EXAMPLE_COST / EXAMPLE_VIEWS) * 1000;
  const cpe = EXAMPLE_COST / EXAMPLE_ENGAGEMENTS;

  return (
    <div className="container-page">
      <title>{"How matching works · " + SITE.name}</title>
      <PageHeader
        eyebrow="Methodology"
        title="How matching works"
        description="InfluencerAI ranks creators with a transparent, weighted score. Here is exactly what goes into it, what removes a creator from the list, how costs are estimated and what the score can't tell you."
        actions={
          <ButtonLink to="/match">
            Try it with a brief
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-10 pb-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <TableOfContents />

        <div className="min-w-0 max-w-3xl space-y-16">
          <MethodSection
            id="score"
            intro={`Every eligible creator gets a score from 0 to 100: a weighted average of ${SCORE_KEYS.length} components, each scored 0–100 with a one-line reason you can read on the result. These are the default weights.`}
          >
            <ScoreComponentList />
          </MethodSection>

          <MethodSection id="open-criteria">
            <Prose>
              <p>
                A brief rarely specifies everything. When it leaves a criterion open (an empty list, gender set to Any, or no budget),
                that component is skipped instead of scored, and the remaining weights are re-normalised so they add up to 100% again.
                No creator is marked down for something you didn't ask for.
              </p>
              <p>
                {labelList(ALWAYS_APPLIED)} always count, because they describe the creator rather than your targeting. Each
                result shows which components counted and the weight they carried.
              </p>
            </Prose>
            <RenormalisationExample />
          </MethodSection>

          <MethodSection
            id="hard-filters"
            intro="Some requirements aren't a matter of degree. A creator who fails any of these is excluded before ranking. Excluded creators aren't silently dropped: they're listed separately with the reason, so you can review the call."
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {HARD_FILTERS.map((filter) => (
                <li key={filter.title} className="grid">
                  <IconBlock icon={filter.icon} title={filter.title}>
                    <p>{filter.description}</p>
                  </IconBlock>
                </li>
              ))}
            </ul>
          </MethodSection>

          <MethodSection
            id="estimates"
            intro="Estimates use the creator's best platform for your deliverable among the platforms in your brief, and every amount is in rupees."
          >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Definition term="Reach">
                Average views per post on that platform. Follower counts overstate how many people see a post, so views are used
                instead.
              </Definition>
              <Definition term="Cost">
                The creator's indicative fee for the deliverable, from their rate card. Real quotes vary with usage rights,
                exclusivity and timelines.
              </Definition>
              <Definition term="CPM (cost per mille)">Cost per 1,000 estimated views: cost ÷ reach × 1,000.</Definition>
              <Definition term="CPE (cost per engagement)">
                Cost per estimated like, comment, share or save: cost ÷ estimated engagements, which come from the creator's
                engagement rate on that platform.
              </Definition>
            </dl>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900">Worked example</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A reel costing <strong className="font-semibold text-slate-900">{formatINR(EXAMPLE_COST)}</strong> with{" "}
                <strong className="font-semibold text-slate-900">{formatNumber(EXAMPLE_VIEWS)}</strong> estimated views and{" "}
                <strong className="font-semibold text-slate-900">{formatNumber(EXAMPLE_ENGAGEMENTS)}</strong> estimated engagements
                has a CPM of <strong className="font-semibold text-slate-900">{formatINR(cpm)}</strong> and a CPE of{" "}
                <strong className="font-semibold text-slate-900">{formatINR(cpe)}</strong>.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Plan totals add up cost, reach and engagements across the selected creators, then work out CPM and CPE from those
                totals.
              </p>
            </Card>
          </MethodSection>

          <MethodSection
            id="authenticity"
            intro="Every creator profile carries an authenticity score from 0 to 100 (higher means more of the audience looks real and active), an estimated share of suspicious followers, and flags for anything that deserves a human look."
          >
            <Prose>
              <p>In production, the score would combine signals such as:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-brand-400">
                <li>
                  <strong className="font-semibold text-slate-800">Suspicious followers:</strong> bots, mass-follow accounts and
                  profiles that have been inactive for a long time.
                </li>
                <li>
                  <strong className="font-semibold text-slate-800">Growth anomalies:</strong> sudden follower spikes that engagement
                  doesn't follow.
                </li>
                <li>
                  <strong className="font-semibold text-slate-800">Engagement patterns:</strong> rates far above or below what's
                  typical for the creator's size, or comments that are generic and repetitive.
                </li>
                <li>
                  <strong className="font-semibold text-slate-800">Audience fit:</strong> followers concentrated in places that don't
                  match the creator's language and content.
                </li>
              </ul>
              <p>
                Authenticity works twice: as a hard filter (minimum {DEFAULT_BRIEF.minAuthenticity} by default) and as{" "}
                {formatWeight(DEFAULT_SHARES.authenticity ?? 0)} of the score, so a cleaner audience ranks higher than an otherwise
                identical one.
              </p>
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                In this demo, authenticity scores and flags are generated with the fictional profiles to show how the signals would
                surface. They are not measurements.
              </p>
            </Prose>
          </MethodSection>

          <MethodSection id="optimiser">
            <Prose>
              <p>
                Once you have a ranked list, the optimiser builds a plan: up to the number of creators you want, without going over
                your budget.
              </p>
              <p>
                It favours creators who deliver the most score-weighted reach per rupee, so a strong match with efficient reach can
                beat a slightly better match that costs several times as much. It also spreads reach across cities, so the plan
                doesn't lean on a single market.
              </p>
              <p>
                The plan shows total cost, reach, engagements, CPM, CPE and the budget left over, with notes on the choices it made.
                You can still add or remove creators by hand.
              </p>
            </Prose>
          </MethodSection>

          <MethodSection
            id="brief-parsing"
            intro="Describe a campaign in plain words, in English, Hindi or Hinglish, and the app turns it into a structured brief you can review."
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <li className="grid">
                <IconBlock icon={Bot} title="Claude, when configured">
                  <p>
                    When the server has an Anthropic API key, a Netlify Function asks Claude to read the brief and return fields that
                    match the brief model. The answer is validated against a strict schema before the app uses it.
                  </p>
                </IconBlock>
              </li>
              <li className="grid">
                <IconBlock icon={ScrollText} title="Built-in rules parser as fallback">
                  <p>
                    Without a key, or if the AI call fails or times out, a rules parser takes over. It recognises niches, languages,
                    cities, regions, tiers, platforms and budgets written like “₹5 lakh”, “tier 2/3”, “Hindi belt” or “Gen Z”.
                  </p>
                </IconBlock>
              </li>
            </ul>
            <Prose className="text-sm">
              <p>
                Either way, the app tells you which parser read the brief and what it assumed, for example reading “₹5 lakh” as{" "}
                {formatINR(500_000)}, and every field stays editable. Brief text sent for AI parsing is used only to produce the
                filters and isn't kept on a server; your saved brief lives in your browser.
              </p>
            </Prose>
          </MethodSection>

          <MethodSection id="data">
            <ul className="grid grid-cols-1 gap-4">
              <li>
                <IconBlock icon={FlaskConical} title="Demo data">
                  <p>
                    Every creator profile, statistic and brand collaboration in this demo is fictional, generated deterministically in
                    code. Brand names are invented too. Nothing here describes a real person or company, and none of it is market
                    data.
                  </p>
                </IconBlock>
              </li>
              <li>
                <IconBlock icon={Smartphone} title="Where real data would come from">
                  <p>
                    A production version would list only creators who opt in, with data from official platform APIs such as the
                    Instagram Graph API and the YouTube Data API, accessed with each creator's permission.
                  </p>
                </IconBlock>
              </li>
              <li>
                <IconBlock icon={ShieldCheck} title="Privacy under India's DPDP Act, 2023">
                  <p>
                    Personal data would be handled in line with the Digital Personal Data Protection Act, 2023: informed consent for a
                    specific purpose, only the data that purpose needs, and simple ways to withdraw consent or ask for erasure.
                  </p>
                  <p>
                    Today the demo has no database: your brief and shortlist stay in your browser, and sign-ups go through Netlify
                    Forms.
                  </p>
                </IconBlock>
              </li>
              <li>
                <IconBlock icon={Megaphone} title="Disclosure under ASCI's influencer guidelines">
                  <p>
                    The Advertising Standards Council of India expects paid partnerships to be disclosed upfront, with labels such as
                    #ad, #collab or #sponsored that the audience can't miss. Outreach drafts include this reminder; brands and
                    creators remain responsible for compliance.
                  </p>
                </IconBlock>
              </li>
            </ul>
          </MethodSection>

          <MethodSection id="limitations" intro="A score is a starting point for a decision, not the decision. Keep these in mind:">
            <ul className="space-y-3">
              {LIMITATIONS.map((item) => (
                <li key={item.title} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                  <strong className="font-semibold text-slate-900">{item.title}</strong> {item.description}
                </li>
              ))}
            </ul>
          </MethodSection>

          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">See it on your own brief</h2>
              <p className="mt-1 text-sm text-slate-600">Every result shows its score breakdown, so you can check the method as you go.</p>
            </div>
            <ButtonLink to="/match" className="w-full sm:w-auto">
              Start matching
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
