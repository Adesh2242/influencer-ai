// Whether an account is a creator a brand can book, or a public figure who merely has an audience.
//
// The database is built by searching YouTube, and YouTube does not distinguish between the two. A
// monastery's channel, a news desk and a food vlogger all look identical to a subscriber count. So
// an ordained Buddhist monk — under a vow that forbids handling money — was scored 90 out of 100
// for an electric scooter campaign, with a button offering to draft his outreach email.
//
// Rankings and prices are beside the point there. Some accounts are not inventory, and a tool that
// cannot say so will keep producing results that are confident, well-formatted and unusable.
import { containsWord, startsWithWord } from "../text";
import type { Creator } from "../../types";

export type AccountKind = "creator" | "religious" | "news" | "institution" | "business";

export interface CommercialStatus {
  kind: AccountKind;
  /** False when a brand should not be approaching this account at all. */
  bookable: boolean;
  /** Plain reason, shown wherever the account is excluded. */
  reason?: string;
  /** The term that decided it, so the call can be checked rather than trusted. */
  matched?: string;
}

/**
 * Titles that are only ever ordained titles. None of these is a Maharashtrian surname, so finding
 * one anywhere in the channel name is decisive.
 */
const ORDAINED_TITLES = [
  "bhikkhu",
  "bhikku",
  "bhikshu",
  "bhante",
  "bhadant",
  "maulana",
  "mufti",
  "reverend",
  "pastor",
  "sadhvi",
  "भिक्खु",
  "भिक्षु",
  "भंते",
  "भदंत",
  "मौलाना",
  "साध्वी",
];

/**
 * Titles that are *also* ordinary Maharashtrian surnames, or royal and affectionate forms of
 * address. Acharya and Maharaj are common family names; Chhatrapati Shivaji Maharaj was a king, so
 * a history channel about him is a perfectly bookable creator. These count only in the leading
 * position a name takes when it is being used as an honorific — "Swami Anand", not "Sneha Acharya".
 */
const HONORIFIC_TITLES = [
  "swami",
  "maharaj",
  "acharya",
  "sadhu",
  "baba",
  "guruji",
  "imam",
  "father",
  "thera",
  "स्वामी",
  "महाराज",
  "आचार्य",
];

/**
 * Words in the bio that corroborate an ordained reading of an ambiguous title: a monastery, an
 * order, a vow. Checked only to upgrade an ambiguous match, never on their own — plenty of lay
 * creators make content about monasteries.
 */
const ORDAINED_CONTEXT = ["monastery", "vihar", "math ", "ashram", "sangha", "ordained", "मठ", "विहार", "आश्रम", "संघ"];

/**
 * Broadcasters and news desks. They sell advertising; they do not take influencer briefs.
 *
 * Split by how safely each term can be matched inside a longer string. A handle has no spaces, so
 * whole-word matching cannot see "news" in "news18marathi" or "mymarathinews" — twelve news
 * channels were still being served for exactly that reason. These terms are distinctive enough
 * that a substring hit is almost always the real thing.
 */
const NEWS_SUBSTRINGS = [
  "news",
  "tv9",
  "tv18",
  "lokmat",
  "aaj tak",
  "samachar",
  "patrika",
  "bulletin",
  "बातम्या",
  "वृत्त",
  "समाचार",
];

/** Short news tokens that collide with ordinary names: "zee" inside "Zeeshan", "saam" in "Saamna". */
const NEWS_WORDS = ["zee", "abp", "saam", "times now", "zee24"];

/**
 * Shops, salons, clinics and other trading businesses. A saree wholesaler and a hair salon were
 * being priced and ranked as influencers in a jewellery shortlist: they have subscribers, so every
 * metric computes, but nobody can book them to endorse anything — they are the ones who would buy.
 *
 * Split by matching safety, the same way the news terms are. These are long and distinctive, so a
 * hit anywhere in the name or handle is reliable — which matters because a handle has no spaces
 * ("ascfashionstore").
 */
const BUSINESS_SUBSTRINGS = [
  "wholesale",
  "bazaar",
  "bazar",
  "showroom",
  "emporium",
  "boutique",
  "parlour",
  "parlor",
  "jewellers",
  "jewelers",
  "supermarket",
  "caterers",
  "furniture",
  "garments",
  "fashionstore",
  "readymade",
];

/**
 * Business words that are ordinary English elsewhere, so they need whole-word matching. "llp"
 * inside "Wallpaper" was a live false positive, which is the same substring trap that put a
 * cooking channel under "Auto & EVs".
 *
 * Deliberately NOT here. "academy" matches 43 creators including working MPSC teachers and dance
 * channels, and "studio" matches dance studios that are genuine content channels. "hotel" and
 * "restaurant" are the sharpest lesson: Hotel Shauryawada is a dhaba with 13,00,000 subscribers
 * and 6,70,000 median views of Marathi food content, and Hotel Namrata turns up more viewers than
 * it has subscribers. A Maharashtra dhaba running a food channel is a creator, and among the most
 * authentically local kind. All four would have cost real reach to remove a handful of shops.
 */
const BUSINESS_WORDS = [
  "salon",
  "spa",
  "traders",
  "enterprises",
  "mart",
  "store",
  "clinic",
  "hospital",
  "institute",
  "coaching",
  "llp",
  "pvt ltd",
  "pvt. ltd",
  "and sons",
  "& sons",
  "opticals",
  "builders",
  "developers",
];

/** Public bodies and official handles. Long and distinctive, so matched as substrings too. */
const INSTITUTION_SUBSTRINGS = [
  "municipal",
  "nagarparishad",
  "nagar parishad",
  "zillaparishad",
  "zilla parishad",
  "mahanagarpalika",
  "महानगरपालिका",
  "नगरपरिषद",
];

/** Institution words that are ordinary English otherwise ("corporation", "collector"). */
const INSTITUTION_WORDS = ["corporation", "government", "govt", "ministry", "police", "collector", "शासन"];

function findSubstring(haystack: string, terms: readonly string[]): string | undefined {
  return terms.find((term) => haystack.includes(term));
}

function findWord(haystack: string, terms: readonly string[]): string | undefined {
  return terms.find((term) => containsWord(haystack, term));
}

function findLeading(haystack: string, terms: readonly string[]): string | undefined {
  return terms.find((term) => startsWithWord(haystack, term));
}

/**
 * Reads the channel's own name and description. The title carries the signal: a monastic uses
 * their title in it, as do news desks and public bodies. Deliberately not inferred from topic or
 * niche — "devotional" content is a perfectly ordinary thing for a bookable creator to make.
 */
export function commercialStatus(input: { name: string; handle?: string; bio?: string }): CommercialStatus {
  const name = input.name.toLowerCase();
  const title = `${name} ${input.handle ?? ""}`.toLowerCase();
  const bio = (input.bio ?? "").toLowerCase();

  const ordained = findWord(title, ORDAINED_TITLES);
  // An ambiguous title counts as an honorific when it leads the channel name, or when the bio
  // corroborates it. "Sneha Acharya, Pune food vlogger" is neither.
  const honorific = findLeading(name, HONORIFIC_TITLES);
  const corroborated = honorific && ORDAINED_CONTEXT.some((word) => bio.includes(word)) ? honorific : undefined;
  const religious = ordained ?? corroborated ?? honorific;
  if (religious) {
    return {
      kind: "religious",
      bookable: false,
      matched: religious,
      reason:
        "Appears to be an ordained religious figure. Many are under vows that forbid handling money, and " +
        "using a monastic in advertising carries a reputational risk no reach figure offsets.",
    };
  }

  const news = findSubstring(title, NEWS_SUBSTRINGS) ?? findWord(title, NEWS_WORDS);
  if (news) {
    return {
      kind: "news",
      bookable: false,
      matched: news,
      reason: "Appears to be a news or broadcast channel. These sell advertising directly; they do not take influencer briefs.",
    };
  }

  const business = findSubstring(title, BUSINESS_SUBSTRINGS) ?? findWord(title, BUSINESS_WORDS);
  if (business) {
    return {
      kind: "business",
      bookable: false,
      matched: business,
      reason: "Appears to be a shop or trading business rather than a creator. These are the people who buy influencer campaigns, not the people who run them.",
    };
  }

  const institution = findSubstring(title, INSTITUTION_SUBSTRINGS) ?? findWord(title, INSTITUTION_WORDS);
  if (institution) {
    return {
      kind: "institution",
      bookable: false,
      matched: institution,
      reason: "Appears to be a public body or official handle rather than a creator.",
    };
  }

  return { kind: "creator", bookable: true };
}

// The matching engine asks this of every creator on every brief, and a creator's name does not
// change between calls, so the verdict is kept per record.
const byCreator = new WeakMap<Creator, CommercialStatus>();

/** Convenience for a stored creator. */
export function statusOf(creator: Creator): CommercialStatus {
  let status = byCreator.get(creator);
  if (!status) {
    status = commercialStatus({ name: creator.name, handle: creator.handle, bio: creator.bio });
    byCreator.set(creator, status);
  }
  return status;
}
