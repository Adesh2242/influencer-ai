import {
  ArrowRight,
  Calculator,
  Check,
  FileDown,
  Gauge,
  IndianRupee,
  Languages,
  ListOrdered,
  Mail,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandEarlyAccessForm } from "@/components/marketing/BrandEarlyAccessForm";
import { FaqList, type FaqItem } from "@/components/marketing/FaqList";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { IndiaCoverage } from "@/components/marketing/IndiaCoverage";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { Section, SectionHeading } from "@/components/marketing/Section";
import { Step } from "@/components/marketing/Step";
import { joinWithAnd } from "@/components/marketing/text";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Score";
import { SITE } from "@/config/site";
import { LANGUAGE_CODES } from "@/data/taxonomy";
import { SCORE_LABELS } from "@/lib/matching/engine";

const LANGUAGE_COUNT = LANGUAGE_CODES.length;

const textLink =
  "font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600 " +
  "focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const HERO_POINTS = ["No sign-up needed", "Hinglish briefs welcome", "Demo uses fictional creators"];

const FEATURES: { icon: LucideIcon; title: string; description: string; tone?: "brand" | "accent" }[] = [
  {
    icon: WandSparkles,
    title: "AI brief understanding",
    description:
      "Paste a brief in plain English or Hinglish. Claude picks out the niche, languages, cities, platforms, budget and competitors to avoid, and shows you what it assumed.",
  },
  {
    icon: Gauge,
    title: "Explainable match scores",
    description:
      "Every 0–100 score is built from eight weighted factors, each with a one-line reason. You can see exactly why a creator ranks where they do.",
  },
  {
    icon: ShieldCheck,
    title: "Audience authenticity screening",
    description:
      "Suspicious follower patterns are flagged, and creators below your authenticity bar are filtered out before ranking, with the reason shown.",
  },
  {
    icon: Languages,
    title: "Regional-language and Bharat reach",
    description: `Target ${LANGUAGE_COUNT} languages and tier 1, 2 and 3 cities by region, state or city, so a campaign can reach Madurai and Muzaffarpur, not just the metros.`,
    tone: "accent",
  },
  {
    icon: IndianRupee,
    title: "Budget planner in rupees",
    description:
      "Estimated fee, reach, CPM and CPE for every creator, totals in lakh and crore, and an optimiser that fits the strongest mix into your budget.",
  },
  {
    icon: Megaphone,
    title: "ASCI-ready outreach",
    description:
      "Outreach drafts in English or Hinglish come with disclosure reminders such as #ad and #collab, in line with ASCI's guidelines for influencer advertising.",
  },
];

function ExampleBrief() {
  return (
    <figure className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <figcaption className="text-xs font-medium text-slate-500">For example</figcaption>
      <blockquote className="mt-1 text-sm italic text-slate-700">
        “Diwali campaign ke liye Hindi belt ke 10 micro fashion creators chahiye, budget 8 lakh.”
      </blockquote>
    </figure>
  );
}

function ExampleBreakdown() {
  return (
    <figure className="space-y-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <Meter label={SCORE_LABELS.niche} valueLabel={92} value={92} />
      <Meter label={SCORE_LABELS.language} valueLabel={100} value={100} />
      <Meter label={SCORE_LABELS.budget} valueLabel={64} value={64} />
      <figcaption className="text-xs text-slate-500">Example breakdown</figcaption>
    </figure>
  );
}

function PlanOutputs() {
  const outputs: { icon: LucideIcon; label: string }[] = [
    { icon: Calculator, label: "Optimise within budget" },
    { icon: FileDown, label: "Export to CSV" },
    { icon: Mail, label: "Outreach drafts" },
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {outputs.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200"
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

const FAQS: FaqItem[] = [
  {
    question: "Is the creator data real?",
    answer: (
      <p>
        No. Every creator in this demo is a fictional profile generated in code: the names, handles, audiences, rates and brand
        collaborations are all invented, and none of them describes a real person or company. A production version would only use
        data that creators consent to share, collected through official platform APIs.
      </p>
    ),
  },
  {
    question: "How is the match score calculated?",
    answer: (
      <>
        <p>
          Each creator gets a 0–100 score from eight weighted factors:{" "}
          {joinWithAnd(Object.values(SCORE_LABELS).map((label) => label.toLowerCase()))}. If your brief leaves a factor open, such as
          no language preference, that factor is skipped and the remaining weights are re-normalised, so no creator is penalised for
          something you didn't ask for.
        </p>
        <p>
          Hard filters, such as a minimum authenticity score or recent work with a competitor, remove creators before ranking, and
          the app tells you why.{" "}
          <Link to="/methodology" className={textLink}>
            Read the full methodology
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    question: "Does outreach follow ASCI guidelines?",
    answer: (
      <p>
        Outreach drafts include disclosure reminders, such as labelling the post #ad or #collab, in line with the Advertising
        Standards Council of India's guidelines for influencer advertising. The drafts are a starting point: brands and creators
        remain responsible for disclosing every partnership clearly.
      </p>
    ),
  },
  {
    question: "What about privacy and the DPDP Act?",
    answer: (
      <>
        <p>
          This demo has no database and no accounts. Your brief and shortlist are saved only in your browser. If AI parsing is
          enabled on the server, the brief text is sent to Claude to be turned into filters and isn't kept on any server by this
          app. Early-access and waitlist sign-ups are collected through Netlify Forms and used only to contact you.
        </p>
        <p>
          A production version would be built around India's Digital Personal Data Protection Act, 2023: clear consent, a stated
          purpose for every piece of data, and the right to withdraw.
        </p>
      </>
    ),
  },
  {
    question: "What does it cost?",
    answer: (
      <p>
        Pricing isn't set during this early demo.{" "}
        <a href="#early-access" className={textLink}>
          Join early access
        </a>{" "}
        to hear first.
      </p>
    ),
  },
];

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-0 size-[32rem] translate-x-1/3 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -bottom-48 left-0 size-[28rem] -translate-x-1/3 rounded-full bg-saffron-200/40 blur-3xl" />
      </div>
      <div className="container-page grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <div>
          <Badge tone="brand" className="px-3 py-1 text-sm">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI creator matching for India
          </Badge>
          <h1 id="hero-title" className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl">
            Find the <span className="text-brand-600">right creators</span> for your Indian brand in minutes
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Describe your campaign in plain words and get a ranked, explainable shortlist across {LANGUAGE_COUNT} languages and tier
            1, 2 and 3 cities, costed and planned around your budget in rupees.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/match" size="lg">
              Start matching
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/discover" size="lg" variant="outline">
              Browse creators
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {HERO_POINTS.map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-600" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <ProductPreview className="mx-auto w-full max-w-lg lg:max-w-none" />
      </div>
    </section>
  );
}

function CreatorTeaser() {
  return (
    <section aria-labelledby="creators-title" className="py-16 sm:py-20">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-12 shadow-lift sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-saffron-400/20 blur-3xl" />
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-saffron-300">For creators</p>
            <h2 id="creators-title" className="mt-2 text-2xl font-extrabold tracking-tight text-balance text-white sm:text-3xl">
              Get discovered by brands that fit your niche, language and city
            </h2>
            <p className="mt-3 text-base leading-relaxed text-brand-100">
              Regional-language and tier 2 and 3 creators are welcome. Rate benchmarks by tier are public, and an authentic,
              engaged audience counts for more than a big follower number.
            </p>
          </div>
          <ButtonLink
            to="/for-creators"
            size="lg"
            className="mt-8 w-full bg-saffron-400 text-slate-950 hover:bg-saffron-300 focus-visible:outline-white sm:w-auto lg:mt-0"
          >
            Join the creator waitlist
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function EarlyAccessPoint({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
      <span className="text-sm leading-relaxed text-slate-600">{children}</span>
    </li>
  );
}

export default function HomePage() {
  return (
    <>
      <title>{"AI creator matching for Indian brands · " + SITE.name}</title>

      <Hero />

      <Section id="how-it-works" aria-labelledby="how-title">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From brief to shortlist in three steps"
          description="No spreadsheets of follower counts. Tell InfluencerAI what you need and get a plan you can act on."
          align="center"
        />
        <ol className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Step step={1} icon={MessageSquareText} title="Describe your campaign" visual={<ExampleBrief />}>
            Write the brief the way you'd explain it to an agency, in English or Hinglish. Claude turns it into filters for niche,
            languages, cities, platforms and budget, and you can adjust every one.
          </Step>
          <Step step={2} icon={ListOrdered} title="Get a ranked, explainable shortlist" visual={<ExampleBreakdown />}>
            Every creator gets a 0–100 match score with the reasons behind it, plus warnings worth a second look, like competitor
            work or a stretched budget. Shortlist the ones you like.
          </Step>
          <Step step={3} icon={Calculator} title="Plan within your budget" visual={<PlanOutputs />}>
            Let the optimiser pick the strongest mix that fits your budget, with cost, reach, CPM and CPE in rupees. Then export the
            plan to CSV and start outreach with ready-made drafts.
          </Step>
        </ol>
        <p className="mt-10 text-center text-sm text-slate-600">
          Curious how the score works?{" "}
          <Link to="/methodology" className={textLink}>
            Read the methodology
          </Link>
        </p>
      </Section>

      <Section aria-labelledby="features-title" className="border-y border-slate-200 bg-white">
        <SectionHeading
          id="features-title"
          eyebrow="What you get"
          title="Everything you need to choose creators with confidence"
          description="Built for the way Indian brands actually run influencer campaigns: many languages, many cities and a budget in rupees."
          align="center"
        />
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <FeatureCard icon={feature.icon} title={feature.title} tone={feature.tone}>
                <p>{feature.description}</p>
              </FeatureCard>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="india-title" className="bg-gradient-to-b from-saffron-50/70 to-slate-50">
        <SectionHeading
          id="india-title"
          eyebrow="Built for India"
          title="Made for Bharat, not just the metros"
          description="Brief in Hinglish, target the Hindi belt or the Northeast, filter by city tier and plan in lakh and crore. Moj and ShareChat sit alongside Instagram and YouTube."
        />
        <IndiaCoverage className="mt-10" />
      </Section>

      <CreatorTeaser />

      <Section id="early-access" aria-labelledby="early-access-title" className="border-y border-slate-200 bg-white">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <SectionHeading
              id="early-access-title"
              eyebrow="Early access"
              title="Bring InfluencerAI to your next campaign"
              description="We're opening InfluencerAI to a small group of Indian brands and agencies. Tell us what you're planning and we'll be in touch."
            />
            <ul className="mt-8 space-y-4">
              <EarlyAccessPoint>
                <strong className="font-semibold text-slate-900">Be first to try what's next,</strong> starting with real creator data
                shared with consent through official platform APIs.
              </EarlyAccessPoint>
              <EarlyAccessPoint>
                <strong className="font-semibold text-slate-900">Help shape the roadmap:</strong> tell us what your campaigns need, from
                outreach tracking to GST-ready invoicing.
              </EarlyAccessPoint>
              <EarlyAccessPoint>
                <strong className="font-semibold text-slate-900">No spam.</strong> We only use your details to contact you about early
                access.
              </EarlyAccessPoint>
            </ul>
          </div>
          <BrandEarlyAccessForm />
        </div>
      </Section>

      <Section id="faq" aria-labelledby="faq-title">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <SectionHeading
            id="faq-title"
            eyebrow="FAQ"
            title="Questions brands ask"
            description={
              <>
                Something else on your mind?{" "}
                <a href="#early-access" className={textLink}>
                  Send us a note
                </a>{" "}
                with the early-access form.
              </>
            }
          />
          <FaqList items={FAQS} />
        </div>
      </Section>
    </>
  );
}
