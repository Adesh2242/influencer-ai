// Product identity in one place so a rename is a one-line change.
export const SITE = {
  name: "InfluencerAI",
  // The old line sold pan-India matching against a dataset of invented creators. Both halves of
  // that are now untrue, and neither was the reason to use this: a buyer can get a ranked list
  // anywhere. What they cannot get elsewhere is an honest view of what a creator delivers.
  tagline: "Maharashtra creator planning, priced on the reach that actually lands in the state.",
  description:
    "A channel with two million subscribers can deliver three thousand views. Every creator here is " +
    "priced on what their recent videos actually did, shown against what they will quote, and " +
    "counted only for the audience inside Maharashtra.",
} as const;

export interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/plan", label: "Plan a budget" },
  { to: "/match", label: "Match a brief" },
  { to: "/discover", label: "Discover" },
  { to: "/shortlist", label: "Shortlist" },
  { to: "/for-creators", label: "For creators" },
  { to: "/methodology", label: "How it works" },
];
