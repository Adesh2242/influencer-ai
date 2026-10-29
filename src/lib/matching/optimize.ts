// Budget planning on top of match results.
//
// planCampaign treats the brief as a small knapsack: pick at most `creatorsWanted` creators whose total
// fee fits the budget while maximising value, where value = (score / 100)^2 × log10(reach + 10). Squaring
// the score makes fit matter more than raw size; the log keeps one mega creator from outweighing several
// well-matched smaller ones. A greedy pass by value per rupee fills the slots cheaply, then an
// improvement pass spends what is left by swapping picks for better-value creators while the plan stays
// within budget. No more than ~40% of picks may share a home city unless the pool leaves no choice.
import { CITY_BY_ID, CREATOR_TIER_LIST, CREATOR_TIERS } from "../../data/taxonomy";
import { formatINRCompact } from "../format";
import type { CampaignPlan, CreatorTier, MatchResult } from "../../types";

/** Share of picks that may come from a single home city. */
const MAX_CITY_SHARE = 0.4;
/** Selections at least this large get a city-concentration note. */
const MIN_SELECTION_FOR_CITY_NOTE = 3;

function cityName(cityId: string): string {
  return CITY_BY_ID[cityId]?.name ?? cityId;
}

function creatorsNoun(count: number): string {
  return count === 1 ? "creator" : "creators";
}

function compareResults(a: MatchResult, b: MatchResult): number {
  return b.score - a.score || a.estimatedCostINR - b.estimatedCostINR || a.creator.id.localeCompare(b.creator.id);
}

function safeAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Totals for a fixed selection, e.g. the user's shortlist. */
export function summarizeSelection(selected: MatchResult[], budgetINR: number): CampaignPlan {
  const budget = safeAmount(budgetINR);
  const totalCostINR = selected.reduce((sum, r) => sum + safeAmount(r.estimatedCostINR), 0);
  const totalReach = selected.reduce((sum, r) => sum + safeAmount(r.estimatedReach), 0);
  const totalEngagements = selected.reduce((sum, r) => sum + safeAmount(r.estimatedEngagements), 0);

  const notes: string[] = [];
  if (selected.length === 0) {
    notes.push("No creators selected yet.");
  } else {
    if (budget > 0) {
      const remaining = budget - totalCostINR;
      if (remaining < 0) notes.push(`Over budget by ${formatINRCompact(-remaining)}`);
      else notes.push(`Within budget: ${formatINRCompact(remaining)} left of ${formatINRCompact(budget)}`);
    } else {
      notes.push("No budget set, so the total isn't checked against one.");
    }

    if (selected.length >= MIN_SELECTION_FOR_CITY_NOTE) {
      const byCity = new Map<string, number>();
      for (const r of selected) byCity.set(r.creator.homeCityId, (byCity.get(r.creator.homeCityId) ?? 0) + 1);
      const [topCity, topCount] = [...byCity.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      if (topCount > selected.length * MAX_CITY_SHARE) {
        notes.push(`${topCount} of ${selected.length} creators are from ${cityName(topCity)}: add other cities for wider reach`);
      }
    }

    const ineligible = selected.filter((r) => r.excludedReason !== null).length;
    if (ineligible > 0) {
      notes.push(
        `${ineligible} of these ${creatorsNoun(selected.length)} ${ineligible === 1 ? "fails" : "fail"} the brief's filters: check before booking`,
      );
    }

    const slowResponders = selected.filter((r) => r.creator.responseRate < 0.5).length;
    if (slowResponders > 0) {
      notes.push(
        `${slowResponders} ${creatorsNoun(slowResponders)} ${slowResponders === 1 ? "replies" : "reply"} to fewer than half of brand enquiries: line up backups`,
      );
    }
  }

  return {
    selected,
    totalCostINR,
    totalReach,
    totalEngagements,
    cpmINR: totalReach > 0 ? (totalCostINR / totalReach) * 1000 : 0,
    cpeINR: totalEngagements > 0 ? totalCostINR / totalEngagements : 0,
    remainingBudgetINR: budget - totalCostINR,
    notes,
  };
}

interface Candidate {
  result: MatchResult;
  cost: number;
  value: number;
  city: string;
}

function valueOf(result: MatchResult): number {
  const fit = Math.max(0, result.score) / 100;
  return fit * fit * Math.log10(safeAmount(result.estimatedReach) + 10);
}

function describeMix(selected: MatchResult[]): string {
  const counts = new Map<CreatorTier, number>();
  for (const r of selected) counts.set(r.creator.tier, (counts.get(r.creator.tier) ?? 0) + 1);
  const parts = CREATOR_TIER_LIST.filter((tier) => counts.has(tier)).map((tier) => {
    const label = CREATOR_TIERS[tier].label.split(" (")[0].toLowerCase();
    return `${counts.get(tier)} ${label}`;
  });
  return `Mix: ${parts.join(", ")}.`;
}

/** Picks up to `creatorsWanted` creators from `candidates` that maximise value within `budgetINR`. */
export function planCampaign(candidates: MatchResult[], budgetINR: number, creatorsWanted: number): CampaignPlan {
  const budget = safeAmount(budgetINR);
  const wanted = Number.isFinite(creatorsWanted) ? Math.max(0, Math.floor(creatorsWanted)) : 0;

  const seen = new Set<string>();
  const pool: Candidate[] = [];
  for (const result of [...candidates].sort(compareResults)) {
    if (result.excludedReason !== null || seen.has(result.creator.id)) continue;
    seen.add(result.creator.id);
    pool.push({ result, cost: safeAmount(result.estimatedCostINR), value: valueOf(result), city: result.creator.homeCityId });
  }
  const skipped = candidates.length - pool.length;

  const finish = (picked: Candidate[], planNotes: string[]): CampaignPlan => {
    const selected = picked.map((c) => c.result).sort(compareResults);
    const summary = summarizeSelection(selected, budget);
    if (selected.length > 0) planNotes.push(describeMix(selected));
    const notes = [...planNotes, ...summary.notes.filter((note) => !planNotes.includes(note))];
    return { ...summary, notes };
  };

  if (wanted === 0) return finish([], ["Set how many creators you want to plan a campaign."]);
  if (pool.length === 0) {
    return finish([], [candidates.length > 0 ? "None of these creators pass the brief's filters." : "No matching creators to plan with."]);
  }

  const planNotes: string[] = [];
  if (skipped > 0) planNotes.push(`Left out ${skipped} ${creatorsNoun(skipped)} that fail the brief's filters or appear twice.`);

  if (budget === 0) {
    const picked = pool.slice(0, wanted);
    planNotes.unshift(`No budget set, so this is the top ${picked.length} by match score.`);
    if (picked.length < wanted) planNotes.push(`Only ${pool.length} ${creatorsNoun(pool.length)} match this brief.`);
    return finish(picked, planNotes);
  }

  const cityCap = Math.max(1, Math.floor(wanted * MAX_CITY_SHARE));
  const picked: Candidate[] = [];
  const chosen = new Set<Candidate>();
  const cityCounts = new Map<string, number>();
  let spent = 0;
  let cappedOut = false;

  const pick = (c: Candidate) => {
    picked.push(c);
    chosen.add(c);
    spent += c.cost;
    cityCounts.set(c.city, (cityCounts.get(c.city) ?? 0) + 1);
  };

  // Greedy fill by value per rupee; cheap well-matched creators claim the slots first.
  const byEfficiency = [...pool].sort(
    (a, b) => b.value / Math.max(b.cost, 1) - a.value / Math.max(a.cost, 1) || compareResults(a.result, b.result),
  );
  for (const c of byEfficiency) {
    if (picked.length >= wanted) break;
    if (spent + c.cost > budget) continue;
    if ((cityCounts.get(c.city) ?? 0) >= cityCap) {
      cappedOut = true;
      continue;
    }
    pick(c);
  }

  // Too few cities in the pool to honour the cap: fill the remaining slots anyway.
  let relaxed = false;
  if (picked.length < wanted) {
    for (const c of byEfficiency) {
      if (picked.length >= wanted) break;
      if (chosen.has(c) || spent + c.cost > budget) continue;
      pick(c);
      relaxed = true;
    }
  }
  const effectiveCap = Math.max(cityCap, ...cityCounts.values());

  // Improvement pass: apply the single best value-improving swap that stays within budget and the city
  // cap, until none is left. Each swap strictly raises total value, so this terminates.
  let swaps = 0;
  const maxSwaps = wanted * 4 + 20;
  while (swaps < maxSwaps) {
    let best: { out: number; in: Candidate; gain: number } | null = null;
    for (let i = 0; i < picked.length; i++) {
      const out = picked[i];
      const room = budget - spent + out.cost;
      for (const c of pool) {
        if (chosen.has(c) || c.cost > room) continue;
        const gain = c.value - out.value;
        if (gain <= 1e-9 || (best && gain <= best.gain)) continue;
        if (c.city !== out.city && (cityCounts.get(c.city) ?? 0) >= effectiveCap) continue;
        best = { out: i, in: c, gain };
      }
    }
    if (!best) break;
    const out = picked[best.out];
    chosen.delete(out);
    spent -= out.cost;
    cityCounts.set(out.city, (cityCounts.get(out.city) ?? 0) - 1);
    picked.splice(best.out, 1);
    pick(best.in);
    swaps += 1;
  }

  if (picked.length === 0) {
    const cheapest = Math.min(...pool.map((c) => c.cost));
    return finish([], [
      ...planNotes,
      `No eligible creator fits within ${formatINRCompact(budget)}: the lowest fee is ${formatINRCompact(cheapest)}.`,
    ]);
  }

  planNotes.unshift(
    `Picked ${picked.length} of ${pool.length} eligible ${creatorsNoun(pool.length)}, weighing match score against estimated reach per rupee.`,
  );
  if (picked.length < wanted) {
    planNotes.push(
      pool.length < wanted
        ? `Only ${pool.length} ${creatorsNoun(pool.length)} pass the brief's filters, fewer than the ${wanted} you asked for.`
        : `Only ${picked.length} ${creatorsNoun(picked.length)} fit within ${formatINRCompact(budget)}; raise the budget or ask for fewer creators.`,
    );
  }
  if (swaps > 0) {
    planNotes.push(`Used leftover budget for ${swaps} ${swaps === 1 ? "upgrade" : "upgrades"} to better-matched or wider-reach creators.`);
  }
  if (relaxed) {
    planNotes.push(`Not enough creators from other cities, so some cities have more than ${cityCap} ${creatorsNoun(cityCap)}.`);
  } else if (cappedOut && picked.length >= MIN_SELECTION_FOR_CITY_NOTE) {
    planNotes.push(`At most ${cityCap} ${creatorsNoun(cityCap)} per home city, to spread reach across cities.`);
  }
  return finish(picked, planNotes);
}
