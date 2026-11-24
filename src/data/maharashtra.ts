// Gazetteer used to decide whether a creator is based in Maharashtra. No platform API exposes an
// Indian state, so location has to be inferred from the words a creator writes about themselves.
// Entries carry Devanagari and Romanised spellings because Marathi channels mix both freely.
import type { CityTier, Region } from "../types";

export interface MhPlace {
  /** City id from data/taxonomy.ts when one exists, so creators land on a known city. */
  cityId?: string;
  name: string;
  district: string;
  tier: CityTier;
  /** Lowercase Romanised spellings and Devanagari forms. The canonical name is matched too. */
  aliases: string[];
  /**
   * True when the name also reads as an ordinary word or a person's name, so a bare mention is not
   * evidence on its own ("Mira", "Bhandara" the communal meal, "Wai"). These need a location marker
   * nearby before they count.
   */
  ambiguous?: boolean;
}

function place(
  name: string,
  district: string,
  tier: CityTier,
  aliases: string[],
  opts: { cityId?: string; ambiguous?: boolean } = {},
): MhPlace {
  return { name, district, tier, aliases, cityId: opts.cityId, ambiguous: opts.ambiguous };
}

/**
 * Cities, towns and districts of Maharashtra. Tier follows the app's own 1/2/3 split rather than any
 * official classification: 1 = Mumbai and Pune metros, 2 = large non-metro cities, 3 = the rest.
 */
export const MH_PLACES: MhPlace[] = [
  // Mumbai Metropolitan Region
  place("Mumbai", "Mumbai", 1, ["bombay", "mumbaikar", "मुंबई", "बॉम्बे"], { cityId: "mumbai" }),
  place("Navi Mumbai", "Thane", 1, ["navi mumbai", "new bombay", "नवी मुंबई"], { cityId: "mumbai" }),
  place("Thane", "Thane", 2, ["ठाणे"]),
  place("Kalyan", "Thane", 3, ["kalyan dombivli", "dombivli", "कल्याण", "डोंबिवली"]),
  place("Vasai", "Palghar", 3, ["vasai virar", "virar", "वसई", "विरार"]),
  place("Mira Bhayandar", "Thane", 3, ["mira road", "bhayandar", "मीरा भाईंदर"], { ambiguous: true }),
  place("Bhiwandi", "Thane", 3, ["भिवंडी"]),
  place("Ulhasnagar", "Thane", 3, ["उल्हासनगर"]),
  place("Ambernath", "Thane", 3, ["badlapur", "अंबरनाथ"]),
  place("Panvel", "Raigad", 3, ["पनवेल"]),
  place("Palghar", "Palghar", 3, ["पालघर"]),
  place("Nalasopara", "Palghar", 3, ["नालासोपारा"]),

  // Pune belt
  place("Pune", "Pune", 1, ["poona", "punekar", "पुणे", "पुणेकर"], { cityId: "pune" }),
  place("Pimpri-Chinchwad", "Pune", 2, ["pimpri", "chinchwad", "pcmc", "पिंपरी", "चिंचवड"], { cityId: "pune" }),
  place("Lonavala", "Pune", 3, ["lonavla", "लोणावळा"]),
  place("Baramati", "Pune", 3, ["बारामती"]),

  // Large cities
  place("Nagpur", "Nagpur", 2, ["नागपूर", "नागपुर"], { cityId: "nagpur" }),
  place("Nashik", "Nashik", 2, ["nasik", "नाशिक"], { cityId: "nashik" }),
  place("Chhatrapati Sambhajinagar", "Chhatrapati Sambhajinagar", 2, [
    "aurangabad",
    "sambhajinagar",
    "छत्रपती संभाजीनगर",
    "संभाजीनगर",
    "औरंगाबाद",
  ], { cityId: "sambhajinagar" }),
  place("Solapur", "Solapur", 2, ["sholapur", "सोलापूर"]),
  place("Amravati", "Amravati", 2, ["अमरावती"]),
  place("Kolhapur", "Kolhapur", 3, ["कोल्हापूर"], { cityId: "kolhapur" }),
  place("Nanded", "Nanded", 3, ["नांदेड"], { cityId: "nanded" }),
  place("Jalgaon", "Jalgaon", 3, ["जळगाव"]),
  place("Sangli", "Sangli", 3, ["सांगली", "miraj", "मिरज"]),
  place("Satara", "Satara", 3, ["सातारा"]),
  place("Latur", "Latur", 3, ["लातूर"]),
  place("Akola", "Akola", 3, ["अकोला"]),
  place("Chandrapur", "Chandrapur", 3, ["चंद्रपूर"]),
  place("Ahilyanagar", "Ahilyanagar", 3, ["ahmednagar", "ahilya nagar", "अहमदनगर", "अहिल्यानगर"]),
  place("Dhule", "Dhule", 3, ["धुळे"]),
  place("Jalna", "Jalna", 3, ["जालना"]),
  place("Parbhani", "Parbhani", 3, ["परभणी"]),
  place("Beed", "Beed", 3, ["बीड"]),
  place("Yavatmal", "Yavatmal", 3, ["यवतमाळ"]),
  place("Nandurbar", "Nandurbar", 3, ["नंदुरबार"]),
  place("Wardha", "Wardha", 3, ["वर्धा"]),
  place("Washim", "Washim", 3, ["वाशिम"]),
  place("Hingoli", "Hingoli", 3, ["हिंगोली"]),
  place("Gondia", "Gondia", 3, ["gondiya", "गोंदिया"]),
  place("Gadchiroli", "Gadchiroli", 3, ["गडचिरोली"]),
  place("Bhandara", "Bhandara", 3, ["भंडारा"], { ambiguous: true }),
  place("Buldhana", "Buldhana", 3, ["buldana", "बुलढाणा"]),
  place("Dharashiv", "Dharashiv", 3, ["osmanabad", "धाराशिव", "उस्मानाबाद"]),
  place("Malegaon", "Nashik", 3, ["मालेगाव"]),
  place("Ichalkaranji", "Kolhapur", 3, ["इचलकरंजी"]),
  place("Ratnagiri", "Ratnagiri", 3, ["रत्नागिरी"], { cityId: "ratnagiri" }),
  place("Sindhudurg", "Sindhudurg", 3, ["सिंधुदुर्ग", "malvan", "मालवण"]),
  place("Alibaug", "Raigad", 3, ["alibag", "अलिबाग"]),
  place("Raigad", "Raigad", 3, ["रायगड"]),
  place("Shirdi", "Ahilyanagar", 3, ["शिर्डी"]),
  place("Mahabaleshwar", "Satara", 3, ["महाबळेश्वर"]),
  place("Karad", "Satara", 3, ["कराड"]),
  place("Wai", "Satara", 3, ["वाई"], { ambiguous: true }),
  place("Chiplun", "Ratnagiri", 3, ["चिपळूण"]),
];

/** Names for the state itself. A creator saying only "Maharashtra" still counts as located here. */
export const MH_STATE_ALIASES = ["maharashtra", "maharastra", "महाराष्ट्र"];

/**
 * Words that mark the text around them as a statement of where someone lives, rather than a passing
 * mention. "Mumbai street food" is a topic; "based in Mumbai" is an address.
 */
export const LOCATION_MARKERS = [
  "based in",
  "based at",
  "living in",
  "lives in",
  "i live in",
  "from",
  "hometown",
  "home town",
  "native of",
  "resident of",
  "currently in",
  "shifted to",
  "settled in",
  "proud",
  "girl",
  "boy",
  "guy",
  "ka ladka",
  "chi mulgi",
  "cha mulga",
  "राहणार",
  "मूळ",
];

/** Devanagari block. Marathi and Hindi share it, so this alone does not identify Marathi. */
export const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * Words and letters that appear in Marathi but not in Hindi. Used as a language signal only, never
 * as proof of location: plenty of Marathi speakers live outside the state.
 */
export const MARATHI_MARKERS = [
  "ळ", // retroflex L: Marathi and a few other languages, not Hindi
  "आहे",
  "आहेत",
  "नाही",
  "काय",
  "तुम्ही",
  "आम्ही",
  "मराठी",
  "कसे",
  "च्या",
  "ाचा",
  "marathi",
  "मराठमोळ",
];

/**
 * Every district of Maharashtra, grouped into the division its media buying belongs to. Shared by
 * the taxonomy (so a brief can name a district) and by the regional reach model (so a creator's
 * city resolves to a division). Kept here, in the data layer, because having two copies invites
 * them to disagree.
 */
export const DISTRICT_REGION: Record<string, Region> = {
  Mumbai: "mumbai_metro",
  Thane: "mumbai_metro",
  Palghar: "mumbai_metro",
  Raigad: "mumbai_metro",
  Pune: "western",
  Satara: "western",
  Sangli: "western",
  Kolhapur: "western",
  Solapur: "western",
  Nashik: "north",
  Jalgaon: "north",
  Dhule: "north",
  Nandurbar: "north",
  Ahilyanagar: "north",
  "Chhatrapati Sambhajinagar": "marathwada",
  Jalna: "marathwada",
  Beed: "marathwada",
  Latur: "marathwada",
  Dharashiv: "marathwada",
  Nanded: "marathwada",
  Parbhani: "marathwada",
  Hingoli: "marathwada",
  Nagpur: "vidarbha",
  Amravati: "vidarbha",
  Akola: "vidarbha",
  Yavatmal: "vidarbha",
  Wardha: "vidarbha",
  Chandrapur: "vidarbha",
  Gadchiroli: "vidarbha",
  Bhandara: "vidarbha",
  Gondia: "vidarbha",
  Buldhana: "vidarbha",
  Washim: "vidarbha",
  Ratnagiri: "konkan",
  Sindhudurg: "konkan",
};

/** District names, grouped by division, for building brief-parsing aliases. */
export const DISTRICTS = Object.keys(DISTRICT_REGION).sort();
