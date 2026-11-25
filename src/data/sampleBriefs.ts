// Example briefs written the way Maharashtra brand managers actually write them — a mix of Marathi,
// Hinglish and English, naming districts and divisions rather than "South India". Every brand here
// is invented for the demo.
//
// These were pan-India until the catalogue became Maharashtra-only, which made them worse than
// useless: a sample brief asking for Tamil and Malayalam creators could only ever return nothing,
// and the one thing a first-time visitor clicks is a sample.
import { DEFAULT_BRIEF, mergeBrief } from "../lib/brief/defaults";
import type { CampaignBrief } from "../types";

export interface SampleBrief {
  id: string;
  /** Short button label, e.g. "Skincare launch · Pune and Nashik". */
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
    "skincare-marathi",
    "Skincare launch · Marathi women",
    "We're launching Mallige Botanicals' vitamin C serum and SPF 50 sunscreen for women aged 18-34 across Maharashtra. " +
      "Looking for 8 beauty and skincare creators on Instagram Reels and YouTube Shorts who make content in Marathi. " +
      "Pune, Nashik and Kolhapur preferred. Total budget ₹3 lakh. " +
      "Please avoid anyone who has worked with Glowleaf Naturals or Dewberry Skin Lab recently.",
    {
      brandName: "Mallige Botanicals",
      productCategory: "skincare",
      goal: "awareness",
      niches: ["beauty"],
      languages: ["mr"],
      platforms: ["instagram", "youtube"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["18-24", "25-34"],
      targetRegions: ["western", "north"],
      budgetINR: 300_000,
      creatorsWanted: 8,
      excludeBrands: ["Glowleaf Naturals", "Dewberry Skin Lab"],
    },
  ),
  sample(
    "fintech-vidarbha",
    "UPI credit app · Vidarbha",
    "Kauri Credit ka naya UPI + small credit line app launch ho raha hai. Vidarbha ke tier 2 aur tier 3 towns target karna hai — " +
      "Nagpur, Amravati, Akola. Age 18-34, mostly men. 12 creators chahiye jo Marathi ya Hindi mein personal finance " +
      "ya education content banate hain. Budget 8 lakh. YouTube par long-form integration best rahega.",
    {
      brandName: "Kauri Credit",
      productCategory: "UPI and credit app",
      goal: "app_installs",
      niches: ["finance", "education"],
      languages: ["mr", "hi"],
      platforms: ["youtube"],
      deliverable: "video",
      targetGender: "male",
      targetAges: ["18-24", "25-34"],
      targetRegions: ["vidarbha"],
      targetTiers: [2, 3],
      budgetINR: 800_000,
      creatorsWanted: 12,
    },
  ),
  sample(
    "food-marathwada",
    "Masala brand · Marathwada kitchens",
    "Suvarna Masale च्या नव्या गोडा मसाल्यासाठी मराठवाड्यातील फूड क्रिएटर्स हवे आहेत. छत्रपती संभाजीनगर, नांदेड, लातूर. " +
      "6 क्रिएटर्स, मराठी कंटेंट, YouTube Shorts किंवा Instagram Reels. बजेट ₹2.5 लाख. 25-44 वयोगटातील गृहिणी हे मुख्य प्रेक्षक.",
    {
      brandName: "Suvarna Masale",
      productCategory: "goda masala",
      goal: "awareness",
      niches: ["food"],
      languages: ["mr"],
      platforms: ["youtube", "instagram"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["25-34", "35-44"],
      targetRegions: ["marathwada"],
      budgetINR: 250_000,
      creatorsWanted: 6,
    },
  ),
  sample(
    "ev-mumbai-pune",
    "Electric scooter · Mumbai and Pune",
    "Hawabaaz Electric is launching a city e-scooter for daily commuters in Mumbai and Pune. " +
      "We want 10 auto, tech or lifestyle creators aged audience 25-44, Marathi or Hindi, on Instagram and YouTube. " +
      "Budget ₹12 lakh. Riders who actually commute daily, not reviewers who only do superbikes.",
    {
      brandName: "Hawabaaz Electric",
      productCategory: "electric scooter",
      goal: "consideration",
      niches: ["automotive", "tech", "lifestyle"],
      languages: ["mr", "hi"],
      platforms: ["instagram", "youtube"],
      deliverable: "reel",
      targetAges: ["25-34", "35-44"],
      targetRegions: ["mumbai_metro", "western"],
      targetCityIds: ["mumbai", "pune"],
      targetTiers: [1],
      budgetINR: 1_200_000,
      creatorsWanted: 10,
    },
  ),
  sample(
    "agri-khandesh",
    "Seed brand · North Maharashtra farmers",
    "Bhumiputra Seeds is pushing its hybrid range to farmers in Nashik, Jalgaon and Dhule ahead of the kharif season. " +
      "Marathi only, YouTube long-form, 5 agriculture creators. Budget ₹4 lakh. " +
      "Audience is men 35+ who farm onion, cotton or soybean.",
    {
      brandName: "Bhumiputra Seeds",
      productCategory: "hybrid seeds",
      goal: "consideration",
      niches: ["agriculture"],
      languages: ["mr"],
      platforms: ["youtube"],
      deliverable: "video",
      targetGender: "male",
      targetAges: ["35-44", "45+"],
      targetRegions: ["north"],
      targetTiers: [2, 3],
      budgetINR: 400_000,
      creatorsWanted: 5,
    },
  ),
  sample(
    "tourism-konkan",
    "Monsoon tourism · Konkan",
    "Konkan Stays is running a monsoon campaign for its homestays in Ratnagiri and Sindhudurg. " +
      "Want 7 travel and lifestyle creators from Mumbai and Pune who will actually travel down, Marathi or English. " +
      "YouTube Shorts or Instagram Reels, budget ₹6 lakh, audience 25-44 with disposable income.",
    {
      brandName: "Konkan Stays",
      productCategory: "monsoon travel",
      goal: "awareness",
      niches: ["travel", "lifestyle"],
      languages: ["mr", "en"],
      platforms: ["youtube", "instagram"],
      deliverable: "reel",
      targetAges: ["25-34", "35-44"],
      targetRegions: ["konkan", "mumbai_metro"],
      budgetINR: 600_000,
      creatorsWanted: 7,
    },
  ),
];
