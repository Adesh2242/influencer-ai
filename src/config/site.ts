// Product identity in one place so a rename is a one-line change.
export const SITE = {
  name: "InfluencerAI",
  tagline: "AI matchmaking between Indian brands and the creators their customers trust.",
  description:
    "Describe your campaign in plain words and get a ranked, explainable shortlist of creators across 12 Indian languages, every city tier and your budget in rupees.",
} as const;

export interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/match", label: "Match" },
  { to: "/discover", label: "Discover" },
  { to: "/shortlist", label: "Shortlist" },
  { to: "/for-creators", label: "For creators" },
  { to: "/methodology", label: "How it works" },
];
