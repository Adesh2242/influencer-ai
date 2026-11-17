// Maps a YouTube channel onto the app's niche taxonomy.
//
// YouTube's topicDetails gives Wikipedia category URLs, which are free and reliable but very coarse
// ("Lifestyle (sociology)" covers beauty, food and parenting alike). So topics set a first guess and
// keywords in the channel's own text refine it. A channel that matches nothing is dropped rather
// than filed under "lifestyle", because a wrong niche is worse than a missing creator in a shortlist.
import type { Niche } from "../../types";

/** Wikipedia topic ids YouTube returns, mapped to the closest niche we model. */
const TOPIC_TO_NICHE: Record<string, Niche> = {
  Food: "food",
  Fashion: "fashion",
  Beauty: "beauty",
  Tourism: "travel",
  Technology: "tech",
  Finance: "finance",
  Physical_fitness: "fitness",
  Health: "health",
  Video_game_culture: "gaming",
  Action_game: "gaming",
  Role_playing_game: "gaming",
  Knowledge: "education",
  Education: "education",
  Humour: "comedy",
  "Lifestyle_(sociology)": "lifestyle",
  Vehicle: "automotive",
  Religion: "devotional",
  Agriculture: "agriculture",
  Entertainment: "entertainment",
  Sport: "sports",
  Music: "entertainment",
  Film: "entertainment",
  Society: "lifestyle",
  Hobby: "lifestyle",
};

/** Words that pin a niche down when the Wikipedia topic is too broad. Marathi and Hindi included. */
const NICHE_KEYWORDS: Record<Niche, string[]> = {
  beauty: ["makeup", "skincare", "beauty", "मेकअप", "सौंदर्य"],
  fashion: ["fashion", "outfit", "styling", "saree", "फॅशन", "साडी"],
  food: ["recipe", "food", "cooking", "kitchen", "foodie", "रेसिपी", "पाककृती", "खाद्य"],
  travel: ["travel", "trek", "trip", "tourism", "भटकंती", "प्रवास"],
  tech: ["tech", "gadget", "smartphone", "unboxing", "तंत्रज्ञान"],
  finance: ["finance", "investing", "stock", "mutual fund", "गुंतवणूक", "शेअर"],
  fitness: ["fitness", "workout", "gym", "व्यायाम"],
  health: ["health", "wellness", "ayurveda", "आरोग्य"],
  gaming: ["gaming", "gameplay", "bgmi", "freefire", "गेमिंग"],
  education: ["exam", "mpsc", "upsc", "study", "tutorial", "शिक्षण", "अभ्यास"],
  parenting: ["parenting", "baby", "mom", "पालकत्व"],
  comedy: ["comedy", "funny", "prank", "विनोद", "कॉमेडी"],
  lifestyle: ["lifestyle", "vlog", "daily life", "व्लॉग"],
  automotive: ["car", "bike", "auto", "motorcycle", "कार", "गाडी"],
  devotional: ["bhakti", "devotional", "temple", "aarti", "भक्ती", "मंदिर", "आरती"],
  agriculture: ["farming", "agriculture", "krishi", "शेती", "शेतकरी"],
  entertainment: ["entertainment", "music", "song", "film", "मनोरंजन", "गाणी"],
  sports: ["cricket", "kabaddi", "sports", "क्रिकेट", "कबड्डी"],
};

function topicIdFromUrl(url: string): string {
  return url.split("/wiki/")[1] ?? "";
}

/**
 * Returns up to three niches, most confident first, or an empty array when nothing matches.
 * Keyword hits outrank topic hits because they come from the creator's own words.
 */
export function classifyNiches(input: { text: string; topicCategories: string[] }): Niche[] {
  const text = input.text.toLowerCase();
  const scores = new Map<Niche, number>();

  const add = (niche: Niche, weight: number) => scores.set(niche, (scores.get(niche) ?? 0) + weight);

  for (const [niche, words] of Object.entries(NICHE_KEYWORDS) as [Niche, string[]][]) {
    for (const word of words) {
      if (text.includes(word.toLowerCase())) add(niche, 2);
    }
  }

  for (const url of input.topicCategories) {
    const niche = TOPIC_TO_NICHE[topicIdFromUrl(url)];
    if (niche) add(niche, 1);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([niche]) => niche);
}
