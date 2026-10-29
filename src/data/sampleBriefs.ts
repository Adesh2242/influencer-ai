// Example briefs written the way Indian brand managers tend to write them. Every brand here is invented
// for the demo; competitor names come from the fictional brand pool used by the creator dataset.
import { DEFAULT_BRIEF, mergeBrief } from "../lib/brief/defaults";
import type { CampaignBrief } from "../types";

export interface SampleBrief {
  id: string;
  /** Short button label, e.g. "Skincare launch · South India". */
  title: string;
  /** The free-text brief as a brand manager would write it. */
  text: string;
  /** The fully structured brief the text corresponds to. */
  brief: CampaignBrief;
}

function sample(id: string, title: string, text: string, patch: Partial<CampaignBrief>): SampleBrief {
  return { id, title, text, brief: mergeBrief(DEFAULT_BRIEF, { description: text, ...patch }) };
}

export const SAMPLE_BRIEFS: SampleBrief[] = [
  sample(
    "skincare-south",
    "Skincare launch · South India",
    "We're launching Mallige Botanicals' vitamin C serum and SPF 50 sunscreen for women aged 18-34 across South India. " +
      "Looking for 8 beauty and skincare creators on Instagram Reels and YouTube Shorts who make content in Tamil, Telugu, Kannada or Malayalam. " +
      "Total budget ₹3 lakh. Please avoid anyone who has worked with Glowleaf Naturals or Dewberry Skin Lab recently.",
    {
      brandName: "Mallige Botanicals",
      productCategory: "skincare",
      goal: "awareness",
      niches: ["beauty"],
      languages: ["ta", "te", "kn", "ml"],
      platforms: ["instagram", "youtube"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["18-24", "25-34"],
      targetRegions: ["south"],
      budgetINR: 300_000,
      creatorsWanted: 8,
      excludeBrands: ["Glowleaf Naturals", "Dewberry Skin Lab"],
    },
  ),
  sample(
    "fintech-hindi-belt",
    "UPI credit app · Hindi belt",
    "Kauri Credit ka naya UPI + small credit line app launch ho raha hai. Target audience Hindi belt ke tier 2 aur tier 3 towns, age 18-34. " +
      "Goal is app installs. Humein 15 nano aur micro influencers chahiye jo finance ya tech content Hindi mein banate hain, Instagram reels, Moj ya ShareChat pe. " +
      "Budget ₹6 lakh. Competitors: PaisaPilot, RupeeRise. No fake followers please.",
    {
      brandName: "Kauri Credit",
      productCategory: "credit app",
      goal: "app_installs",
      niches: ["finance", "tech"],
      languages: ["hi"],
      platforms: ["instagram", "moj", "sharechat"],
      deliverable: "reel",
      targetAges: ["18-24", "25-34"],
      targetTiers: [2, 3],
      targetRegions: ["north", "central"],
      creatorTiers: ["nano", "micro"],
      budgetINR: 600_000,
      creatorsWanted: 15,
      minAuthenticity: 80,
      excludeBrands: ["PaisaPilot", "RupeeRise"],
    },
  ),
  sample(
    "diwali-snacks",
    "Diwali snack boxes · West India",
    "Chivda Republic is doing a Diwali gifting push for our festive namkeen and dry-fruit boxes in Maharashtra and Gujarat. " +
      "Need 12 food creators who post in Marathi, Gujarati or Hindi, audience mostly families aged 25-44. Instagram reels with a discount code, so the goal is sales. " +
      "Budget ₹4 lakh. Avoid creators who worked with Namkeen Nation or Crunchmunch Foods.",
    {
      brandName: "Chivda Republic",
      productCategory: "snacks",
      goal: "conversions",
      niches: ["food"],
      languages: ["mr", "gu", "hi"],
      platforms: ["instagram"],
      deliverable: "reel",
      targetAges: ["25-34", "35-44"],
      targetRegions: ["west"],
      budgetINR: 400_000,
      creatorsWanted: 12,
      excludeBrands: ["Namkeen Nation", "Crunchmunch Foods"],
    },
  ),
  sample(
    "ev-test-rides",
    "EV scooter test rides · 3 metros",
    "Hawabaaz Electric is opening test rides for our new electric scooter in Bengaluru, Pune and Hyderabad. " +
      "We want 10 auto, tech and urban lifestyle creators on YouTube and Instagram, English or the local language, reaching 18-44 year olds in these cities. " +
      "Budget ₹8 lakh. Skip anyone who did a VoltRide or Bijli Bikes collab.",
    {
      brandName: "Hawabaaz Electric",
      productCategory: "electric scooter",
      goal: "consideration",
      niches: ["automotive", "tech", "lifestyle"],
      languages: ["en", "kn", "mr", "te"],
      platforms: ["instagram", "youtube"],
      deliverable: "reel",
      targetAges: ["18-24", "25-34", "35-44"],
      targetCityIds: ["bengaluru", "pune", "hyderabad"],
      budgetINR: 800_000,
      creatorsWanted: 10,
      excludeBrands: ["VoltRide", "Bijli Bikes"],
    },
  ),
  sample(
    "exam-prep-youtube",
    "JEE/NEET prep app · YouTube",
    "RankRocket Academy is a JEE and NEET exam-prep app. We need 6 education YouTubers who teach in Hindi and English for long-form video integrations " +
      "aimed at students aged 13-24. Goal: app installs. Budget ₹10 lakh. Don't shortlist anyone who promoted PadhaiPlus in the last 6 months.",
    {
      brandName: "RankRocket Academy",
      productCategory: "exam prep app",
      goal: "app_installs",
      niches: ["education"],
      languages: ["hi", "en"],
      platforms: ["youtube"],
      deliverable: "video",
      targetAges: ["13-17", "18-24"],
      budgetINR: 1_000_000,
      creatorsWanted: 6,
      excludeBrands: ["PadhaiPlus"],
    },
  ),
  sample(
    "ayurvedic-haircare-ugc",
    "Ayurvedic hair oil UGC · Bharat",
    "Amla Aangan ayurvedic hair oil ke liye UGC videos chahiye from regional creators on Moj and ShareChat. Hindi, Marathi, Bengali, Tamil, Telugu sab chalega. " +
      "Audience: women 25-44 in Bharat, matlab tier 2 and 3 towns. 20 nano and micro creators, ₹2.5 lakh total. Raw, real, ghar wala feel chahiye. Competitor: Kesarbloom Ayurveda.",
    {
      brandName: "Amla Aangan",
      productCategory: "hair oil",
      goal: "ugc",
      niches: ["beauty", "health"],
      languages: ["hi", "mr", "bn", "ta", "te"],
      platforms: ["moj", "sharechat"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["25-34", "35-44"],
      targetTiers: [2, 3],
      creatorTiers: ["nano", "micro"],
      budgetINR: 250_000,
      creatorsWanted: 20,
      excludeBrands: ["Kesarbloom Ayurveda"],
    },
  ),
];
