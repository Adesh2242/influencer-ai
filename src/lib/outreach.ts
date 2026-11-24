// First-contact drafts from a brand to a creator, as an email or a short DM, in English, Hinglish
// (Roman-script Hindi-English) or Marathi. Every sentence is assembled from parts that are always
// present, so a missing brand name, city or fee changes the wording instead of leaving a gap or
// "undefined".
//
// Marathi matters more here than it looks: the catalogue is Maharashtra-only, and a creator in
// Kolhapur or Nanded who publishes in Marathi is far more likely to answer a Marathi email than an
// English one. So a Marathi-publishing creator gets a Marathi draft by default.
import { AGE_BANDS, CREATOR_TIERS, getCity, LANGUAGES, NICHE_LABELS, PLATFORMS, REGION_LIST, REGIONS, tierForFollowers } from "../data/taxonomy";
import type { AgeBand, CampaignBrief, Creator, Deliverable, MatchResult, Niche, Platform, Region } from "../types";
import { formatINR, formatShare } from "./format";

export type OutreachLanguage = "en" | "hinglish" | "mr";
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

/**
 * A phrase in every supported language. Declared as a total record on purpose: adding a language
 * then fails to compile until every phrase has been translated, rather than silently falling back
 * to English in the middle of a Marathi email.
 */
type Phrase = Record<OutreachLanguage, string>;

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
  mr: {
    post: "ASCI मार्गदर्शक तत्त्वांनुसार, पोस्टच्या कॅप्शनच्या सुरुवातीला #ad किंवा #collab असं स्पष्ट डिस्क्लोजर लेबल असणं आवश्यक आहे.",
    story: "ASCI मार्गदर्शक तत्त्वांनुसार, स्टोरीवर #ad किंवा #collab असं स्पष्ट डिस्क्लोजर लेबल ठळकपणे दिसणं आवश्यक आहे.",
    reel: "ASCI मार्गदर्शक तत्त्वांनुसार, व्हिडिओवर आणि कॅप्शनच्या सुरुवातीला #ad किंवा #collab असं स्पष्ट डिस्क्लोजर लेबल असणं आवश्यक आहे.",
    video:
      "ASCI मार्गदर्शक तत्त्वांनुसार, इंटिग्रेशन सुरू असताना स्क्रीनवर आणि डिस्क्रिप्शनच्या सुरुवातीला #ad किंवा #collab असं स्पष्ट डिस्क्लोजर लेबल असणं आवश्यक आहे.",
  },
};

/**
 * Marathi names for the Maharashtra cities in the catalogue. A Marathi email that says "Pune" in
 * Latin script mid-sentence reads like a translation; "पुणे" reads like a letter.
 */
const MARATHI_CITY: Record<string, string> = {
  mumbai: "मुंबई",
  pune: "पुणे",
  nagpur: "नागपूर",
  nashik: "नाशिक",
  sambhajinagar: "छत्रपती संभाजीनगर",
  kolhapur: "कोल्हापूर",
  nanded: "नांदेड",
};

/**
 * Niche names in Marathi. Mostly transliterations, which is how Marathi digital media actually
 * writes these categories — "लाइफस्टाइल कंटेंट" rather than a coined Sanskrit compound nobody uses.
 * Where a plain Marathi word is the ordinary one (शेती, आरोग्य, शिक्षण), that is used instead.
 */
const MARATHI_NICHE: Record<Niche, string> = {
  beauty: "ब्युटी आणि स्किनकेअर",
  fashion: "फॅशन",
  food: "खाद्यपदार्थ",
  travel: "प्रवास",
  tech: "टेक आणि गॅजेट्स",
  finance: "पर्सनल फायनान्स",
  fitness: "फिटनेस",
  health: "आरोग्य",
  gaming: "गेमिंग",
  education: "शिक्षण आणि करिअर",
  parenting: "पालकत्व",
  comedy: "कॉमेडी",
  lifestyle: "लाइफस्टाइल",
  automotive: "ऑटो आणि ईव्ही",
  devotional: "भक्ती आणि संस्कृती",
  agriculture: "शेती",
  entertainment: "सिनेमा, संगीत आणि नृत्य",
  sports: "क्रीडा",
};

const MARATHI_REGION: Record<Region, string> = {
  mumbai_metro: "मुंबई महानगर",
  western: "पश्चिम महाराष्ट्र",
  north: "उत्तर महाराष्ट्र",
  marathwada: "मराठवाडा",
  vidarbha: "विदर्भ",
  konkan: "कोकण",
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
  "1": { en: "metro cities", hinglish: "metro cities", mr: "महानगरांमध्ये" },
  "2": { en: "tier 2 cities", hinglish: "tier 2 cities", mr: "टियर 2 शहरांमध्ये" },
  "3": { en: "tier 3 cities and towns", hinglish: "tier 3 cities aur towns", mr: "टियर 3 शहरं आणि गावांमध्ये" },
  "1,2": { en: "metros and tier 2 cities", hinglish: "metros aur tier 2 cities", mr: "महानगरं आणि टियर 2 शहरांमध्ये" },
  "2,3": { en: "tier 2 and 3 cities", hinglish: "tier 2 aur 3 cities", mr: "टियर 2 आणि 3 शहरांमध्ये" },
  "1,3": { en: "metros and tier 3 towns", hinglish: "metros aur tier 3 towns", mr: "महानगरं आणि टियर 3 गावांमध्ये" },
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
    const ids = cities.map((city) => city.cityId);
    const names = ids.map((id) => getCity(id)?.name ?? "").filter(Boolean);
    // "येथील" and "येथे" attach to an uninflected place name, so this stays correct Marathi for any
    // city in the catalogue without needing the locative form of each one ("पुणे" -> "पुण्यात").
    const marathiNames = ids.map((id) => MARATHI_CITY[id] ?? getCity(id)?.name ?? "").filter(Boolean);
    facts.push({
      en: `${formatShare(cityShare)} of your audience is in ${joinList(names, "and")}`,
      hinglish: `aapki ${formatShare(cityShare)} audience ${joinList(names, "aur")} mein hai`,
      mr: `तुमचे ${formatShare(cityShare)} प्रेक्षक ${joinList(marathiNames, "आणि")} येथे आहेत`,
    });
  } else if (brief.targetRegions.length > 0 && regionShare >= 0.35) {
    const regions = REGION_LIST.filter((region) => brief.targetRegions.includes(region));
    const labels = regions.map((region) => REGIONS[region].label);
    facts.push({
      en: `${formatShare(regionShare)} of your audience is in ${joinList(labels, "and")}`,
      hinglish: `aapki ${formatShare(regionShare)} audience ${joinList(labels, "aur")} mein hai`,
      mr: `तुमचे ${formatShare(regionShare)} प्रेक्षक ${joinList(regions.map((region) => MARATHI_REGION[region]), "आणि")} येथे आहेत`,
    });
  } else if (tierPhrase && tierShare >= 0.35) {
    facts.push({
      en: `${formatShare(tierShare)} of your audience lives in ${tierPhrase.en}`,
      hinglish: `aapki ${formatShare(tierShare)} audience ${tierPhrase.hinglish} mein hai`,
      mr: `तुमचे ${formatShare(tierShare)} प्रेक्षक ${tierPhrase.mr} राहतात`,
    });
  }

  const language = creator.languages.find((code) => brief.languages.includes(code));
  if (language) {
    const label = LANGUAGES[language].label;
    facts.push({
      en: `you create in ${label}`,
      hinglish: `aap ${label} mein content banate hain`,
      // "भाषेत" carries the locative, so the language's own name needs no inflection.
      mr: `तुम्ही ${LANGUAGES[language].native} भाषेत कंटेंट बनवता`,
    });
  }

  if (brief.targetGender !== "any") {
    const share = audience.gender[brief.targetGender] ?? 0;
    const group = brief.targetGender === "female" ? "women" : "men";
    const marathiGroup = brief.targetGender === "female" ? "महिला" : "पुरुष";
    if (share >= 0.55) {
      facts.push({
        en: `${formatShare(share)} of your audience are ${group}`,
        hinglish: `aapki ${formatShare(share)} audience ${group} hai`,
        mr: `तुमच्या प्रेक्षकांपैकी ${formatShare(share)} ${marathiGroup} आहेत`,
      });
    }
  }

  if (brief.targetAges.length > 0 && brief.targetAges.length < AGE_BANDS.length) {
    const share = sum(brief.targetAges.map((band) => audience.age[band] ?? 0));
    if (share >= 0.5) {
      facts.push({
        en: `${formatShare(share)} of your audience is aged ${agePhrase(brief.targetAges, "and")}`,
        hinglish: `aapki ${formatShare(share)} audience ${agePhrase(brief.targetAges, "aur")} age group mein hai`,
        mr: `तुमचे ${formatShare(share)} प्रेक्षक ${agePhrase(brief.targetAges, "आणि")} वयोगटातील आहेत`,
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
        mr: `तुमचा एंगेजमेंट रेट तुमच्याएवढ्या क्रिएटर्सच्या सरासरीपेक्षा ${times} आहे`,
      });
    }
  }

  if (creator.authenticity.score >= 85) {
    facts.push({
      en: "your audience is genuine and engaged",
      hinglish: "aapki audience genuine aur engaged hai",
      mr: "तुमचे प्रेक्षक खरे आणि सक्रिय आहेत",
    });
  }

  return facts;
}

function mentionedNiche(creator: Creator, brief: CampaignBrief): Niche | undefined {
  return creator.niches.find((niche) => brief.niches.includes(niche)) ?? creator.niches[0];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The language to open the draft in. Marathi for a creator who publishes in Marathi — which in this
 * catalogue is most of them — because that is the language they will reply in. A creator who
 * publishes only in Hindi gets Hinglish, which is how brands actually write to them; everyone else
 * gets English.
 */
export function defaultOutreachLanguage(creator: Creator): OutreachLanguage {
  if (creator.languages.includes("mr")) return "mr";
  if (creator.languages.includes("hi") && !creator.languages.includes("en")) return "hinglish";
  return "en";
}

/** Builds a personalised first message. Pure: the same input always gives the same text. */
export function buildOutreachMessage({ creator, brief, estimate, language, channel }: OutreachInput): OutreachMessage {
  const hinglish = language === "hinglish";
  const marathi = language === "mr";
  const pick = (phrase: Phrase) => phrase[language];

  const firstName = firstNameOf(creator.name);
  const brandName = clean(brief.brandName);
  const rawCategory = clean(brief.productCategory);
  const category = rawCategory.length > 0 && rawCategory.length <= 40 ? softLowercase(rawCategory.replace(/\s+campaign$/i, "")) : "";
  const city = getCity(creator.homeCityId)?.name ?? "";
  const niche = mentionedNiche(creator, brief);
  const content = niche ? `${softLowercase(NICHE_LABELS[niche])} content` : "content";
  const marathiContent = niche ? `${MARATHI_NICHE[niche]} कंटेंट` : "कंटेंट";

  const deliverable = resolveDeliverable(brief.deliverable, estimate.platform);
  const format = `1 ${deliverableName(deliverable, estimate.platform)}`;
  const fee = Number.isFinite(estimate.estimatedCostINR) && estimate.estimatedCostINR > 0 ? formatINR(estimate.estimatedCostINR) : "";
  const gst = creator.gstRegistered ? (language === "en" ? " plus GST" : " + GST") : "";

  const turnaround = creator.avgTurnaroundDays;
  const draftDays = Number.isFinite(turnaround) && turnaround > 0 ? Math.min(21, Math.max(2, Math.round(turnaround))) : 7;
  // Two days to brief the creator, the draft, then a few days for one round of feedback and scheduling.
  const liveWeeks = Math.max(2, Math.ceil((draftDays + 5) / 7));

  const facts = fitFacts(creator, brief, estimate.platform);
  const fallbackFact: Phrase = {
    en: "your audience is exactly who we want to reach",
    hinglish: "aapki audience hi hamari target audience hai",
    mr: "तुमचे प्रेक्षक हीच आमची टार्गेट ऑडियन्स आहे",
  };
  const [firstFact = fallbackFact, secondFact] = facts;
  const AND: Record<OutreachLanguage, string> = { en: "and", hinglish: "aur", mr: "आणि" };
  const why = secondFact ? `${pick(firstFact)}, ${AND[language]} ${pick(secondFact)}` : pick(firstFact);

  const asci = asciDisclosureLine(language, deliverable);

  if (marathi) {
    const from = brandName ? `${brandName} कडून` : "आमच्या ब्रँडकडून";
    // "कॅम्पेनसाठी" / "कॅम्पेनमध्ये": the postposition attaches, so the phrase is built without it
    // and each sentence adds the one it needs.
    const campaign = category ? `आमच्या ${category} कॅम्पेन` : "आमच्या पुढील कॅम्पेन";
    const marathiCity = city ? (MARATHI_CITY[creator.homeCityId] ?? city) : "";
    const liked = marathiCity ? `${marathiCity} येथील तुमचं ${marathiContent}` : `तुमचं ${marathiContent}`;
    // liveWeeks is always 2 or more and draftDays always 2 or more, so both take the plural, but
    // the singular is kept rather than assumed away.
    const weeks = liveWeeks === 1 ? "1 आठवड्यात" : `${liveWeeks} आठवड्यांत`;
    const days = draftDays === 1 ? "1 दिवसात" : `${draftDays} दिवसांत`;

    if (channel === "dm") {
      const offer = fee
        ? `प्रस्तावित मानधन ${fee}${gst}, आणि कंटेंट ${weeks} लाइव्ह करायचं आहे.`
        : `तुमचा दर कळवा, आणि कंटेंट ${weeks} लाइव्ह करायचं आहे.`;
      return {
        subject: null,
        body: [
          `${firstName ? `नमस्कार ${firstName}!` : "नमस्कार!"} आम्ही ${from} एका पेड कोलॅबसाठी संपर्क करत आहोत. ${liked} आम्हाला खूप आवडतं, आणि तुम्ही आमच्यासाठी अगदी योग्य वाटता: ${firstFact.mr}.`,
          `${campaign}साठी ${format} बनवाल का? ${offer}`,
          asci,
          "रस असेल तर उत्तर द्या, आम्ही संपूर्ण ब्रीफ पाठवू.",
        ].join("\n\n"),
      };
    }

    return {
      subject: brandName ? `${brandName} सोबत पेड कोलॅबोरेशन: ${format}` : `पेड कोलॅबोरेशनची संधी: ${format}`,
      body: [
        firstName ? `नमस्कार ${firstName},` : "नमस्कार,",
        `आम्ही ${from} एका पेड कोलॅबोरेशनसाठी संपर्क करत आहोत. ${liked} आम्ही आवडीने पाहतो, आणि ${campaign}साठी तुम्ही अगदी योग्य वाटता: ${why}.`,
        [
          "आमची योजना अशी आहे:",
          `• डिलिव्हरेबल: ${format}`,
          `• प्रस्तावित मानधन: ${fee ? `${fee}${gst} (चर्चेसाठी खुलं)` : "तुमच्या कोटेशननुसार"}`,
          `• टाइमलाइन: तुमच्या होकारानंतर 2 कामकाजाच्या दिवसांत ब्रीफ, सुमारे ${days} पहिला ड्राफ्ट, आणि ${weeks} कंटेंट लाइव्ह`,
        ].join("\n"),
        asci,
        "तुम्हाला यात रस असेल तर या ईमेलला उत्तर द्या. आम्ही संपूर्ण ब्रीफ, usage rights आणि पेमेंट टर्म्स पाठवू.",
        `धन्यवाद,\n${brandName ? `${brandName} टीम` : "पार्टनरशिप्स टीम"}`,
      ].join("\n\n"),
    };
  }

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
