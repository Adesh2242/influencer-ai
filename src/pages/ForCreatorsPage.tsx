import { ArrowRight, BadgeCheck, Check, IndianRupee, Link2, MapPin, Search, ShieldCheck, UserRoundPlus } from "lucide-react";
import type { ReactNode } from "react";
import { CreatorWaitlistForm } from "@/components/marketing/CreatorWaitlistForm";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { RateBenchmarkTable } from "@/components/marketing/RateBenchmarkTable";
import { Section, SectionHeading } from "@/components/marketing/Section";
import { Step } from "@/components/marketing/Step";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { SITE } from "@/config/site";
import { CREATOR_TIERS, LANGUAGE_CODES, LANGUAGES } from "@/data/taxonomy";
import { formatPercent } from "@/lib/format";

const LANGUAGE_COUNT = LANGUAGE_CODES.length;

function LanguageScripts() {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lift backdrop-blur sm:p-6">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Create in any of {LANGUAGE_COUNT} languages
      </figcaption>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {LANGUAGE_CODES.map((code) => {
          const { label, native } = LANGUAGES[code];
          return (
            <li key={code} className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
              <span lang={code} className="block text-lg font-semibold leading-snug text-slate-900">
                {native}
              </span>
              {native !== label ? <span className="text-xs text-slate-500">{label}</span> : null}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

function WaitlistPoint({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-saffron-50 text-saffron-700 ring-1 ring-inset ring-saffron-200">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
      <span className="text-sm leading-relaxed text-slate-600">{children}</span>
    </li>
  );
}

export default function ForCreatorsPage() {
  const micro = CREATOR_TIERS.micro;

  return (
    <>
      <title>{"For creators · " + SITE.name}</title>

      <section
        aria-labelledby="creators-hero-title"
        className="relative isolate overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 right-0 size-[30rem] translate-x-1/3 rounded-full bg-saffron-200/50 blur-3xl" />
          <div className="absolute -bottom-48 left-0 size-[26rem] -translate-x-1/3 rounded-full bg-brand-200/40 blur-3xl" />
        </div>
        <div className="container-page grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Badge tone="accent" className="px-3 py-1 text-sm">
              For creators
            </Badge>
            <h1
              id="creators-hero-title"
              className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl"
            >
              Get discovered by brands that fit your <span className="text-brand-600">niche, language and city</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {SITE.name} helps Indian brands find creators by what they make and who watches, not just by follower count. Whether
              you post in Odia from Cuttack or in Kannada from Hubballi, the right brand can find you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#waitlist" className={buttonClasses("primary", "lg")}>
                Join the waitlist
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <a href="#rates" className={buttonClasses("outline", "lg")}>
                See rate benchmarks
              </a>
            </div>
          </div>
          <LanguageScripts />
        </div>
      </section>

      <Section aria-labelledby="why-title">
        <SectionHeading
          id="why-title"
          eyebrow="Why join"
          title="Matching that works for creators too"
          description="Brands get a shortlist ranked by fit. That means being the right creator matters more than being the biggest one."
          align="center"
        />
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <li>
            <FeatureCard icon={Search} title="Found by brands that fit">
              <p>
                Brands describe their campaign and see creators ranked by niche, language, audience and city. When a campaign fits
                what you make, you rank for it, whatever your follower count.
              </p>
            </FeatureCard>
          </li>
          <li>
            <FeatureCard icon={IndianRupee} title="Fair, transparent rate benchmarks" tone="accent">
              <p>
                Typical fees for each creator tier are public, and they're the same benchmarks brands plan with. Pricing
                conversations start from shared numbers, not guesswork.
              </p>
            </FeatureCard>
          </li>
          <li>
            <FeatureCard icon={MapPin} title="Regional and tier 2 and 3 creators welcome">
              <p>
                Brands can target {LANGUAGE_COUNT} languages and tier 1, 2 and 3 cities, so creators outside the metros and the
                English-language feed are part of the shortlist, not an afterthought.
              </p>
            </FeatureCard>
          </li>
          <li>
            <FeatureCard icon={ShieldCheck} title="Authenticity is rewarded">
              <p>
                Engagement is compared with creators of your size, and audience authenticity is part of every match score. A real,
                engaged audience beats a bought one.
              </p>
            </FeatureCard>
          </li>
        </ul>
      </Section>

      <Section aria-labelledby="plan-title" className="border-y border-slate-200 bg-white">
        <SectionHeading
          id="plan-title"
          eyebrow="What's planned"
          title="How creator sign-up will work"
          description="The current demo uses fictional profiles. Here's how real creators will join once sign-up opens."
          align="center"
        />
        <ol className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Step step={1} icon={UserRoundPlus} title="Join the waitlist">
            Tell us your main platform, city, language and niche, so we can invite creators in the right order.
          </Step>
          <Step step={2} icon={Link2} title="Connect with consent">
            Link your accounts through official platform APIs and choose what to share. Nothing is scraped, and you can withdraw
            your consent at any time.
          </Step>
          <Step step={3} icon={BadgeCheck} title="Get matched">
            Appear in shortlists for campaigns that fit your content and audience, with a score that explains why you're a match.
          </Step>
        </ol>
      </Section>

      <Section id="rates" aria-labelledby="rates-title">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
          <SectionHeading
            id="rates-title"
            eyebrow="Rate benchmarks"
            title="What creators typically charge, by tier"
            description={
              <>
                Typical engagement is also the bar used when scoring engagement: a micro creator at {formatPercent(4.8)} is well
                above the {formatPercent(micro.engagementBenchmark)} typical for their tier.
              </>
            }
          />
          <div>
            <RateBenchmarkTable caption="Illustrative rate benchmarks by creator tier: follower range, typical engagement and typical fee for one reel" />
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-700">Illustrative planning benchmarks, not quotes.</strong> Fees are for one
              reel on the creator's main platform. Real fees depend on the format, usage rights, exclusivity, timelines and the
              creator.
            </p>
          </div>
        </div>
      </Section>

      <Section id="waitlist" aria-labelledby="waitlist-title" className="border-t border-slate-200 bg-white">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <SectionHeading
              id="waitlist-title"
              eyebrow="Creator waitlist"
              title="Be first in line when sign-up opens"
              description="Every niche, language and size is welcome, from nano creators to household names."
            />
            <ul className="mt-8 space-y-4">
              <WaitlistPoint>
                <strong className="font-semibold text-slate-900">Your data, your call.</strong> Profiles will only be built from
                what you choose to share.
              </WaitlistPoint>
              <WaitlistPoint>
                <strong className="font-semibold text-slate-900">One email when it matters.</strong> We'll contact you about creator
                sign-up and nothing else.
              </WaitlistPoint>
              <WaitlistPoint>
                <strong className="font-semibold text-slate-900">Help shape it.</strong> Early creators help decide how rates,
                disclosures and brand outreach work.
              </WaitlistPoint>
            </ul>
          </div>
          <CreatorWaitlistForm />
        </div>
      </Section>
    </>
  );
}
