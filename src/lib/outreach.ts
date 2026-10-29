// First-contact drafts from a brand to a creator, in English or Hinglish (Roman-script Hindi-English),
// as an email or a short DM. Every sentence is assembled from parts that are always present, so a
// missing brand name, city or fee changes the wording instead of leaving a gap or "undefined".
import { AGE_BANDS, CREATOR_TIERS, getCity, LANGUAGES, NICHE_LABELS, PLATFORMS, REGION_LIST, REGIONS, tierForFollowers } from "../data/taxonomy";
import type { AgeBand, CampaignBrief, Creator, Deliverable, MatchResult, Niche, Platform } from "../types";
import { formatINR, formatShare } from "./format";

export type OutreachLanguage = "en" | "hinglish";
export type OutreachChannel = "email" | "dm";

export interface OutreachInput {
  creator: Creator;
  brief: CampaignBrief;
  /** The creator's MatchResult for the brief: the platform and fee to propose. */
  estimate: Pick<MatchResult, "platform" | "estimatedCostINR">;
  language: OutreachLanguage;
  channel: OutreachChannel;
}

export interface OutreachMessage {
  /** null for DMs, which have no subject line. */
  subject: string | null;
  body: string;
}

/** A phrase in both supported languages. */
interface Phrase {
  en: string;
  hinglish: string;
}

type DisclosureFormat = "post" | "story" | "reel" | "video";

const ASCI_LINES: Record<OutreachLanguage, Record<DisclosureFormat, string>> = {
  en: {
    post: "As per ASCI guidelines, the post must carry a clear disclosure label like #ad or #collab at the start of the caption.",
    story: "As per ASCI guidelines, the story must carry a clear disclosure label like #ad or #collab, easy to see on the story itself.",
    reel: "As per ASCI guidelines, the video must carry a clear disclosure label like #ad or #collab, on screen and at the start of the caption.",
    video:
      "As per ASCI guidelines, the video must carry a clear disclosure label like #ad or #collab, on screen during the integration and at the start of the description.",
  },
  hinglish: {
    post: "ASCI guidelines ke hisaab se, post ke caption ki shuruaat mein #ad ya #collab jaisa clear disclosure label hona zaroori hai.",
    story: "ASCI guidelines ke hisaab se, story par #ad ya #collab jaisa clear disclosure label saaf dikhna zaroori hai.",
    reel: "ASCI guidelines ke hisaab se, video par aur caption ki shuruaat mein #ad ya #collab jaisa clear disclosure label hona zaroori hai.",
    video:
      "ASCI guidelines ke hisaab se, integration ke dauraan screen par aur description ki shuruaat mein #ad ya #collab jaisa clear disclosure label hona zaroori hai.",
  },
};

/** The advertising-disclosure reminder (ASCI influencer guidelines) included in every draft. */
export function asciDisclosureLine(language: OutreachLanguage, deliverable: Deliverable): string {
  return ASCI_LINES[language][deliverable];
}

/** Honorifics that come before a first name in display names ("Dr. Meera Iyer", "CA Rohan Shah"). */
const TITLES = new Set(["dr", "mr", "mrs", "ms", "prof", "chef", "ca", "adv", "coach"]);

/** "Meera" from "Dr. Meera Iyer"; "" for an empty name. */
export function firstNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.find((part) => !TITLES.has(part.replace(/\.$/, "").toLowerCase())) ?? parts[0] ?? "";
}

/** The brief's deliverable when the platform supports it, otherwise the platform's main format. */
export function resolveDeliverable(deliverable: Deliverable, platform: Platform): Deliverable {
  const supported = PLATFORMS[platform].deliverables;
  return supported.includes(deliverable) ? deliverable : (supported[0] ?? deliverable);
}

/** "Instagram Reel", "YouTube Short", "Moj short video", "YouTube integration"... */
export function deliverableName(deliverable: Deliverable, platform: Platform): string {
  const label = PLATFORMS[platform].label;
  switch (deliverable) {
    case "reel":
      if (platform === "instagram") return "Instagram Reel";
      if (platform === "youtube") return "YouTube Short";
      return `${label} short video`;
    case "story":
      return `${label} Story`;
    case "post":
      return platform === "instagram" ? "Instagram feed post" : `${label} post`;
    case "video":
      return platform === "youtube" ? "YouTube integration" : `${label} video`;
  }
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Lowercases a leading capital unless the word looks like an acronym ("Skincare" -> "skincare", "UPI app" stays). */
function softLowercase(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function joinList(items: string[], and: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

const TIER_PHRASES: Record<string, Phrase> = {
  "1": { en: "metro cities", hinglish: "metro cities" },
  "2": { en: "tier 2 cities", hinglish: "tier 2 cities" },
  "3": { en: "tier 3 cities and towns", hinglish: "tier 3 cities aur towns" },
  "1,2": { en: "metros and tier 2 cities", hinglish: "metros aur tier 2 cities" },
  "2,3": { en: "tier 2 and 3 cities", hinglish: "tier 2 aur 3 cities" },
  "1,3": { en: "metros and tier 3 towns", hinglish: "metros aur tier 3 towns" },
};

/** "18-34" for adjacent bands, "18-24 and 45+" otherwise. */
function agePhrase(bands: AgeBand[], and: string): string {
  const runs: AgeBand[][] = [];
  let previousIndex = -2;
  AGE_BANDS.forEach((band, index) => {
    if (!bands.includes(band)) return;
    const run = runs[runs.length - 1];
    if (run && index === previousIndex + 1) run.push(band);
    else runs.push([band]);
    previousIndex = index;
  });
  const labels = runs.map((run) => {
    const start = (run[0] ?? "").split(/[-+]/)[0] ?? "";
    const last = run[run.length - 1] ?? "";
    return last.endsWith("+") ? `${start}+` : `${start}-${last.split("-")[1] ?? ""}`;
  });
  return joinList(labels, and);
}

/** Up to a few facts about why this creator suits the brief, most specific first. */
function fitFacts(creator: Creator, brief: CampaignBrief, platform: Platform): Phrase[] {
  const facts: Phrase[] = [];
  const audience = creator.audience;

  const cities = audience.topCities.filter((city) => brief.targetCityIds.includes(city.cityId) && getCity(city.cityId));
  const cityShare = sum(cities.map((city) => city.share));
  const regionShare = sum(brief.targetRegions.map((region) => audience.regions[region] ?? 0));
  const tiers = [...brief.targetTiers].sort((a, b) => a - b);
  const tierPhrase = TIER_PHRASES[tiers.join(",")];
  const tierShare = sum(tiers.map((tier) => audience.tiers[tier] ?? 0));

  if (cities.length > 0 && cityShare >= 0.1) {
    const names = cities.map((city) => getCity(city.cityId)?.name ?? "").filter(Boolean);
    facts.push({
      en: `${formatShare(cityShare)} of your audience is in ${joinList(names, "and")}`,
      hinglish: `aapki ${formatShare(cityShare)} audience ${joinList(names, "aur")} mein hai`,
    });
  } else if (brief.targetRegions.length > 0 && regionShare >= 0.35) {
    const labels = REGION_LIST.filter((region) => brief.targetRegions.includes(region)).map((region) => REGIONS[region].label);
    facts.push({
      en: `${formatShare(regionShare)} of your audience is in ${joinList(labels, "and")} India`,
      hinglish: `aapki ${formatShare(regionShare)} audience ${joinList(labels, "aur")} India mein hai`,
    });
  } else if (tierPhrase && tierShare >= 0.35) {
    facts.push({
      en: `${formatShare(tierShare)} of your audience lives in ${tierPhrase.en}`,
      hinglish: `aapki ${formatShare(tierShare)} audience ${tierPhrase.hinglish} mein hai`,
    });
  }

  const language = creator.languages.find((code) => brief.languages.includes(code));
  if (language) {
    const label = LANGUAGES[language].label;
    facts.push({ en: `you create in ${label}`, hinglish: `aap ${label} mein content banate hain` });
  }

  if (brief.targetGender !== "any") {
    const share = audience.gender[brief.targetGender] ?? 0;
    const group = brief.targetGender === "female" ? "women" : "men";
    if (share >= 0.55) {
      facts.push({ en: `${formatShare(share)} of your audience are ${group}`, hinglish: `aapki ${formatShare(share)} audience ${group} hai` });
    }
  }

  if (brief.targetAges.length > 0 && brief.targetAges.length < AGE_BANDS.length) {
    const share = sum(brief.targetAges.map((band) => audience.age[band] ?? 0));
    if (share >= 0.5) {
      facts.push({
        en: `${formatShare(share)} of your audience is aged ${agePhrase(brief.targetAges, "and")}`,
        hinglish: `aapki ${formatShare(share)} audience ${agePhrase(brief.targetAges, "aur")} age group mein hai`,
      });
    }
  }

  const stats = creator.platforms.find((p) => p.platform === platform) ?? creator.platforms[0];
  if (stats) {
    const ratio = stats.engagementRate / CREATOR_TIERS[tierForFollowers(stats.followers)].engagementBenchmark;
    if (Number.isFinite(ratio) && ratio >= 1.15) {
      const times = `${ratio.toFixed(1)}x`;
      facts.push({
        en: `your engagement rate is ${times} the norm for creators your size`,
        hinglish: `aapka engagement rate aapke size ke creators ke average se ${times} hai`,
      });
    }
  }

  if (creator.authenticity.score >= 85) {
    facts.push({ en: "your audience is genuine and engaged", hinglish: "aapki audience genuine aur engaged hai" });
  }

  return facts;
}

function mentionedNiche(creator: Creator, brief: CampaignBrief): Niche | undefined {
  return creator.niches.find((niche) => brief.niches.includes(niche)) ?? creator.niches[0];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Builds a personalised first message. Pure: the same input always gives the same text. */
export function buildOutreachMessage({ creator, brief, estimate, language, channel }: OutreachInput): OutreachMessage {
  const hinglish = language === "hinglish";
  const pick = (phrase: Phrase) => (hinglish ? phrase.hinglish : phrase.en);

  const firstName = firstNameOf(creator.name);
  const brandName = clean(brief.brandName);
  const rawCategory = clean(brief.productCategory);
  const category = rawCategory.length > 0 && rawCategory.length <= 40 ? softLowercase(rawCategory.replace(/\s+campaign$/i, "")) : "";
  const city = getCity(creator.homeCityId)?.name ?? "";
  const niche = mentionedNiche(creator, brief);
  const content = niche ? `${softLowercase(NICHE_LABELS[niche])} content` : "content";

  const deliverable = resolveDeliverable(brief.deliverable, estimate.platform);
  const format = `1 ${deliverableName(deliverable, estimate.platform)}`;
  const fee = Number.isFinite(estimate.estimatedCostINR) && estimate.estimatedCostINR > 0 ? formatINR(estimate.estimatedCostINR) : "";
  const gst = creator.gstRegistered ? (hinglish ? " + GST" : " plus GST") : "";

  const turnaround = creator.avgTurnaroundDays;
  const draftDays = Number.isFinite(turnaround) && turnaround > 0 ? Math.min(21, Math.max(2, Math.round(turnaround))) : 7;
  // Two days to brief the creator, the draft, then a few days for one round of feedback and scheduling.
  const liveWeeks = Math.max(2, Math.ceil((draftDays + 5) / 7));

  const facts = fitFacts(creator, brief, estimate.platform);
  const fallbackFact: Phrase = {
    en: "your audience is exactly who we want to reach",
    hinglish: "aapki audience hi hamari target audience hai",
  };
  const [firstFact = fallbackFact, secondFact] = facts;
  const why = secondFact
    ? hinglish
      ? `${firstFact.hinglish}, aur ${secondFact.hinglish}`
      : `${firstFact.en}, and ${secondFact.en}`
    : pick(firstFact);

  const asci = asciDisclosureLine(language, deliverable);

  if (hinglish) {
    const from = brandName ? `${brandName} ki taraf se` : "apne brand ki taraf se";
    const campaign = category ? `hamare ${category} campaign` : "hamare agle campaign";
    const liked = city ? `${city} se aapka ${content}` : `Aapka ${content}`;

    if (channel === "dm") {
      const offer = fee
        ? `Proposed fee ${fee}${gst} hai, aur content ${liveWeeks} hafte mein live karna hai.`
        : `Aapka quote jaanna chahenge, aur content ${liveWeeks} hafte mein live karna hai.`;
      return {
        subject: null,
        body: [
          `${firstName ? `Hi ${firstName}!` : "Namaste!"} Hum ${from} ek paid collab ke liye message kar rahe hain. ${liked} humein bahut pasand hai, aur aap hamare liye perfect fit lagte hain: ${firstFact.hinglish}.`,
          `Kya aap ${campaign} ke liye ${format} banana chahenge? ${offer}`,
          asci,
          "Interested hain toh reply kariye, hum full brief share kar denge.",
        ].join("\n\n"),
      };
    }

    return {
      subject: brandName ? `${brandName} ke saath paid collab: ${format}` : `Paid collab ka offer: ${format}`,
      body: [
        firstName ? `Namaste ${firstName} ji,` : "Namaste,",
        `Hum ${from} ek paid collaboration ke baare mein likh rahe hain. ${liked} humein bahut pasand aata hai, aur ${campaign} ke liye aap perfect fit lagte hain: ${why}.`,
        [
          "Plan kuch aisa hai:",
          `• Deliverable: ${format}`,
          `• Proposed fee: ${fee ? `${fee}${gst} (discussion ke liye open)` : "aapke quote ke hisaab se"}`,
          `• Timeline: aapke go-ahead ke 2 working days mein brief, lagbhag ${draftDays} din mein first draft, aur ${liveWeeks} hafte mein content live`,
        ].join("\n"),
        asci,
        "Agar aap interested hain, toh bas is email ka reply kar dijiye. Hum full brief, usage rights aur payment terms share kar denge.",
        `Dhanyavaad,\n${brandName ? `${brandName} team` : "Partnerships team"}`,
      ].join("\n\n"),
    };
  }

  const brand = brandName || "our brand";
  const campaign = category ? `our ${category} campaign` : "our upcoming campaign";
  const from = city ? ` from ${city}` : "";
  const weeks = plural(liveWeeks, "week", "weeks");

  if (channel === "dm") {
    const offer = fee
      ? `Proposed fee: ${fee}${gst}, with the content live within ${weeks}.`
      : `We'd love to hear your rate, with the content live within ${weeks}.`;
    return {
      subject: null,
      body: [
        `${firstName ? `Hi ${firstName}!` : "Hi there!"} I'm reaching out about a paid collaboration with ${brand}. We love your ${content}${from}, and we think you'd be a great fit: ${firstFact.en}.`,
        `Would you be up for ${format} for ${campaign}? ${offer}`,
        asci,
        "Interested? Reply here and we'll share the full brief.",
      ].join("\n\n"),
    };
  }

  return {
    subject: `Paid collaboration with ${brand}: ${format}`,
    body: [
      firstName ? `Hi ${firstName},` : "Hi there,",
      `I'm reaching out about a paid collaboration with ${brand}. We've been following your ${content}${from} and think you'd be a great fit for ${campaign}: ${why}.`,
      [
        "Here's what we have in mind:",
        `• Deliverable: ${format}`,
        `• Proposed fee: ${fee ? `${fee}${gst} (open to discussion)` : "open to your quote"}`,
        `• Timeline: brief within 2 working days of your go-ahead, first draft in about ${plural(draftDays, "day", "days")}, content live within ${weeks}`,
      ].join("\n"),
      asci,
      "If this sounds interesting, just reply to this email and we'll share the full brief, usage rights and payment terms.",
      `Warm regards,\n${brandName ? `The ${brandName} team` : "The partnerships team"}`,
    ].join("\n\n"),
  };
}
