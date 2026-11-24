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

export type AccountKind = "creator" | "religious" | "news" | "institution";

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

/** Broadcasters and news desks. They sell advertising; they do not take influencer briefs. */
const NEWS_TERMS = [
  "news",
  "tv9",
  "abp",
  "zee",
  "lokmat",
  "saam",
  "tv18",
  "aaj tak",
  "samachar",
  "patrika",
  "times now",
  "bulletin",
  "बातम्या",
  "वृत्त",
  "समाचार",
];

/** Public bodies and official handles. */
const INSTITUTION_TERMS = [
  "municipal",
  "corporation",
  "nagar parishad",
  "zilla parishad",
  "government",
  "govt",
  "ministry",
  "police",
  "collector",
  "महानगरपालिका",
  "नगरपरिषद",
  "शासन",
];

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

  const news = findWord(title, NEWS_TERMS);
  if (news) {
    return {
      kind: "news",
      bookable: false,
      matched: news,
      reason: "Appears to be a news or broadcast channel. These sell advertising directly; they do not take influencer briefs.",
    };
  }

  const institution = findWord(title, INSTITUTION_TERMS);
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
