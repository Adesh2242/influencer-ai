// What separates a Maharashtra tool from a national one with a state filter.
//
// The most expensive mistake in regional Indian influencer buying is paying for reach that lands
// outside the state. A Mumbai creator publishing in Hindi to a pan-India audience may deliver
// 2,25,000 views of which a fifth are in Maharashtra; a Marathi creator in Nashik delivers 45,000
// of which nearly all are. On a national CPM the first looks cheaper per view. On the only number
// a Maharashtra brand should care about — cost per relevant view — it is an order of magnitude
// worse. Everything here exists to make that comparison visible.
//
// Measured on the first 60 ingested creators: those publishing in Marathi had a median 33,985
// views against 2,228 for the rest, at comparable subscriber counts. Marathi content is not only
// an audience filter, it is a quality signal — the inflated-subscriber channels were overwhelmingly
// in the non-Marathi group.
import { DISTRICT_REGION, MH_PLACES } from "../data/maharashtra";
import type { Creator, CreatorTier, Region } from "../types";

/**
 * The six sub-regions Maharashtra marketers actually plan against. Districts are grouped the way
 * media buying treats them, which is not identical to the administrative divisions: Mumbai's metro
 * belt is planned separately from the rest of coastal Konkan because it behaves like a different
 * market.
 *
 * Populations are approximate, rounded from census projections, and are used for coverage
 * reporting rather than any precise calculation.
 */
/** Maharashtra's divisions, named in types.ts as `Region`: in this product there is no other kind. */
export type SubRegion = Region;

export const SUB_REGIONS: Record<SubRegion, { label: string; population: number; note: string }> = {
  mumbai_metro: { label: "Mumbai Metropolitan", population: 2_60_00_000, note: "Mumbai, Thane, Palghar, Raigad" },
  western: { label: "Western Maharashtra", population: 2_40_00_000, note: "Pune, Satara, Sangli, Kolhapur, Solapur" },
  vidarbha: { label: "Vidarbha", population: 2_40_00_000, note: "Nagpur, Amravati, Akola, Chandrapur and east" },
  marathwada: { label: "Marathwada", population: 2_00_00_000, note: "Chhatrapati Sambhajinagar, Nanded, Latur, Beed" },
  north: { label: "North Maharashtra", population: 1_50_00_000, note: "Nashik, Jalgaon, Dhule, Ahilyanagar" },
  konkan: { label: "Konkan", population: 30_00_000, note: "Ratnagiri, Sindhudurg" },
};


/** City id (from the taxonomy) to sub-region, built from the gazetteer. */
const CITY_SUB_REGION: Record<string, SubRegion> = (() => {
  const map: Record<string, SubRegion> = {};
  for (const place of MH_PLACES) {
    const region = DISTRICT_REGION[place.district];
    if (region && place.cityId) map[place.cityId] = region;
  }
  // No hand-written fallbacks: every district in the gazetteer appears in DISTRICT_SUB_REGION, so
  // the loop above already covers every mapped city. A test asserts that, which is more use than
  // a list that silently shadows the gazetteer if a district is ever regrouped.
  return map;
})();

export function subRegionOf(cityId: string | undefined): SubRegion | undefined {
  return cityId ? CITY_SUB_REGION[cityId] : undefined;
}

/**
 * Share of a creator's audience estimated to sit inside Maharashtra, 0..1.
 *
 * This is modelled, not measured — YouTube keeps audience geography private to the channel owner —
 * so it is an estimate and labelled as one everywhere it surfaces. The signals are the ones a
 * human buyer would use, weighted the way a human buyer would weight them:
 *
 *   language  Marathi content is near-exclusively consumed in Maharashtra and by the Marathi
 *             diaspora. It is by far the strongest signal available.
 *   scale     Reach concentrates locally at the small end and nationally at the large end. A
 *             nano creator's audience is their town; a mega creator's is the country.
 *   home      A creator outside the two metros is usually serving their own region, while a
 *             Mumbai creator is as likely to be making national content from the media capital.
 */
export function maharashtraShare(creator: Creator): number {
  const marathi = creator.languages.includes("mr");
  const hindiOnly = !marathi && creator.languages.includes("hi");

  let share = marathi ? 0.78 : hindiOnly ? 0.22 : 0.14;

  const byTier: Record<CreatorTier, number> = {
    nano: 0.1,
    micro: 0.05,
    mid: 0,
    macro: -0.06,
    mega: -0.12,
  };
  share += byTier[creator.tier];

  // Mumbai is the national media base; everywhere else in the state skews local.
  const region = subRegionOf(creator.homeCityId);
  if (region && region !== "mumbai_metro") share += 0.08;

  return Number(Math.max(0.05, Math.min(0.95, share)).toFixed(2));
}

export interface LocalReach {
  /** Total views, wherever they land. */
  views: number;
  /** Estimated share inside Maharashtra. */
  share: number;
  /** Views estimated to land inside Maharashtra. */
  localViews: number;
  subRegion?: SubRegion;
}

export function localReachOf(creator: Creator): LocalReach {
  const views = creator.platforms[0]?.avgViews ?? 0;
  const share = maharashtraShare(creator);
  return {
    views,
    share,
    localViews: Math.round(views * share),
    subRegion: subRegionOf(creator.homeCityId),
  };
}

export interface RegionalValue {
  localViews: number;
  share: number;
  /** Cost per 1,000 views that actually land in Maharashtra. The number that matters here. */
  localCPM: number;
  /** Cost per 1,000 views anywhere, for comparison. */
  nationalCPM: number;
  /** How much worse the local CPM is than the national one — the waste multiple. */
  wasteMultiple: number;
}

/**
 * Re-prices a booking on relevant reach. A national CPM flatters any creator whose audience sits
 * outside the state; this is the same fee divided by the views a Maharashtra brand can use.
 */
export function regionalValue(creator: Creator, fee: number): RegionalValue {
  const { views, share, localViews } = localReachOf(creator);
  const nationalCPM = views > 0 ? Math.round((fee / views) * 1000) : 0;
  const localCPM = localViews > 0 ? Math.round((fee / localViews) * 1000) : 0;
  return {
    localViews,
    share,
    localCPM,
    nationalCPM,
    wasteMultiple: nationalCPM > 0 ? Number((localCPM / nationalCPM).toFixed(2)) : 0,
  };
}

export interface CoverageRow {
  subRegion: SubRegion;
  label: string;
  creators: number;
  localViews: number;
  population: number;
  /** Local views as a share of the sub-region's population. Crude, but comparable across rows. */
  penetration: number;
}

/**
 * Which parts of the state a set of creators actually covers. Maharashtra marketers plan by
 * sub-region, and a plan can look well funded while leaving 2.4 crore people in Vidarbha untouched.
 */
export function coverageBySubRegion(creators: readonly Creator[]): CoverageRow[] {
  const rows = new Map<SubRegion, { creators: number; localViews: number }>();
  for (const creator of creators) {
    const reach = localReachOf(creator);
    if (!reach.subRegion) continue;
    const row = rows.get(reach.subRegion) ?? { creators: 0, localViews: 0 };
    row.creators++;
    row.localViews += reach.localViews;
    rows.set(reach.subRegion, row);
  }

  return (Object.keys(SUB_REGIONS) as SubRegion[])
    .map((subRegion) => {
      const row = rows.get(subRegion) ?? { creators: 0, localViews: 0 };
      const { label, population } = SUB_REGIONS[subRegion];
      return {
        subRegion,
        label,
        creators: row.creators,
        localViews: row.localViews,
        population,
        penetration: Number(((row.localViews / population) * 100).toFixed(2)),
      };
    })
    .sort((a, b) => b.localViews - a.localViews);
}
