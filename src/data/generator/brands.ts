// Invented brands for the demo dataset's past collaborations and the sample briefs. None of these is a
// real company; any resemblance to a real brand is unintended.
import type { Niche } from "../../types";

export interface FictionalBrand {
  name: string;
  category: string;
  /** Creator niches this brand typically works with. */
  niches: Niche[];
}

export const FICTIONAL_BRANDS: FictionalBrand[] = [
  // Beauty and personal care
  { name: "Glowleaf Naturals", category: "Skincare", niches: ["beauty"] },
  { name: "Dewberry Skin Lab", category: "Sunscreen & skincare", niches: ["beauty"] },
  { name: "Kesarbloom Ayurveda", category: "Ayurvedic haircare", niches: ["beauty", "health"] },
  { name: "Saffronveil Cosmetics", category: "Makeup", niches: ["beauty", "fashion"] },
  { name: "TressTonic", category: "Haircare", niches: ["beauty"] },
  { name: "Beardsmith & Co.", category: "Men's grooming", niches: ["beauty", "lifestyle"] },
  // Fashion
  { name: "Threadkatha", category: "Ethnic wear", niches: ["fashion"] },
  { name: "Mojri Lane", category: "Footwear", niches: ["fashion"] },
  { name: "UrbanDhaaga", category: "Streetwear", niches: ["fashion", "lifestyle"] },
  { name: "Zariwala Studio", category: "Wedding wear", niches: ["fashion"] },
  { name: "Chandrika Jewels", category: "Jewellery", niches: ["fashion"] },
  // Food and beverages
  { name: "ChaiKart", category: "Tea", niches: ["food"] },
  { name: "Namkeen Nation", category: "Snacks", niches: ["food"] },
  { name: "Crunchmunch Foods", category: "Snacks", niches: ["food"] },
  { name: "Tadkaa Tales Spices", category: "Spices", niches: ["food"] },
  { name: "Millet Mitra", category: "Millet snacks", niches: ["food", "health"] },
  { name: "Kulhad Coffee Co.", category: "Coffee", niches: ["food", "lifestyle"] },
  { name: "GheeGood Dairy", category: "Ghee & dairy", niches: ["food"] },
  { name: "Thali Express", category: "Food delivery", niches: ["food", "lifestyle"] },
  // Travel
  { name: "Yatrika Stays", category: "Homestays", niches: ["travel"] },
  { name: "GoGhoomo", category: "Travel booking app", niches: ["travel", "tech"] },
  { name: "Pahadi Trails", category: "Trek operator", niches: ["travel", "fitness"] },
  { name: "RailRasta", category: "Train travel app", niches: ["travel"] },
  // Tech
  { name: "Bytewala", category: "Gadget retail", niches: ["tech"] },
  { name: "NovaBeat Audio", category: "Earbuds", niches: ["tech", "entertainment"] },
  { name: "PixelPeak Mobiles", category: "Smartphones", niches: ["tech"] },
  { name: "SwiftSutra AI", category: "AI productivity app", niches: ["tech", "education"] },
  { name: "Wattwise Smart Home", category: "Smart home devices", niches: ["tech", "lifestyle"] },
  // Personal finance
  { name: "PaisaPilot", category: "Fintech app", niches: ["finance"] },
  { name: "RupeeRise", category: "Credit & UPI app", niches: ["finance"] },
  { name: "KhataKhazana", category: "Payments", niches: ["finance"] },
  { name: "Nivesh Nest", category: "Mutual fund app", niches: ["finance"] },
  { name: "ShieldSure Insurance", category: "Insurance", niches: ["finance", "health"] },
  { name: "Sona Sanchay", category: "Digital gold", niches: ["finance"] },
  // Fitness and health
  { name: "FitDesi", category: "Fitness app", niches: ["fitness"] },
  { name: "Pehlwan Protein", category: "Protein supplements", niches: ["fitness", "health"] },
  { name: "StrideSutra", category: "Activewear", niches: ["fitness", "fashion", "sports"] },
  { name: "Vaidya Veda", category: "Ayurvedic wellness", niches: ["health"] },
  { name: "SukhNeend Sleep Co.", category: "Mattresses", niches: ["health", "lifestyle"] },
  { name: "SakhiCare", category: "Period care", niches: ["health", "beauty"] },
  { name: "DawaDost", category: "Online pharmacy", niches: ["health"] },
  // Gaming
  { name: "KhelVerse", category: "Mobile games", niches: ["gaming"] },
  { name: "RaidRush Esports", category: "Esports league", niches: ["gaming"] },
  { name: "Lucky11 Fantasy", category: "Real-money fantasy gaming", niches: ["gaming", "sports"] },
  // Education
  { name: "PadhaiPlus", category: "Test prep app", niches: ["education"] },
  { name: "VidyaVerse", category: "Online courses", niches: ["education"] },
  { name: "BolEnglish", category: "Spoken English app", niches: ["education"] },
  { name: "CodeChakra", category: "Coding bootcamp", niches: ["education", "tech"] },
  // Parenting
  { name: "Lori Baby Care", category: "Baby care", niches: ["parenting"] },
  { name: "NanhaNest", category: "Diapers", niches: ["parenting"] },
  { name: "KidKatha", category: "Kids' storytelling app", niches: ["parenting", "education"] },
  // Lifestyle and home
  { name: "GharSaaz Decor", category: "Home decor", niches: ["lifestyle"] },
  { name: "Bhow Bhow Bites", category: "Pet food", niches: ["lifestyle"] },
  { name: "Aanganwala Living", category: "Furniture", niches: ["lifestyle"] },
  // Auto and EVs
  { name: "VoltRide", category: "EV scooters", niches: ["automotive", "tech"] },
  { name: "Bijli Bikes", category: "EV scooters", niches: ["automotive"] },
  { name: "ChargeChakra", category: "EV charging", niches: ["automotive", "tech"] },
  { name: "RoadRaja Tyres", category: "Tyres", niches: ["automotive"] },
  { name: "HelmetHero", category: "Helmets", niches: ["automotive"] },
  // Devotional and culture
  { name: "PoojaPath", category: "Puja essentials", niches: ["devotional"] },
  { name: "Mandir Mitra", category: "Devotional app", niches: ["devotional"] },
  // Agriculture
  { name: "Khet Kranti Seeds", category: "Seeds", niches: ["agriculture"] },
  { name: "TractorTalk", category: "Tractor marketplace", niches: ["agriculture", "automotive"] },
  { name: "Fasalwala Agritech", category: "Agritech app", niches: ["agriculture"] },
  // Entertainment and sport
  { name: "Taal Tunes", category: "Music streaming", niches: ["entertainment"] },
  { name: "Natak OTT", category: "OTT streaming", niches: ["entertainment", "comedy"] },
  { name: "Sixer Sports Gear", category: "Cricket gear", niches: ["sports"] },
  { name: "Gully Goals", category: "Sports apparel", niches: ["sports", "fitness"] },
];

export const REAL_MONEY_GAMING_BRAND = "Lucky11 Fantasy";
