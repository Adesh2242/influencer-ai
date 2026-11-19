import { describe, expect, it } from "vitest";
import { festivalsForNiche, MH_FESTIVALS, upcomingFestivals } from "./calendar";
import { SUB_REGIONS } from "../lib/regional";

describe("the Maharashtra calendar", () => {
  it("includes the moments a national plan misses", () => {
    const ids = MH_FESTIVALS.map((f) => f.id);
    expect(ids).toContain("ganesh-chaturthi");
    expect(ids).toContain("gudi-padwa");
    expect(ids).toContain("ashadhi-ekadashi");
  });

  it("makes Ganesh Chaturthi the biggest regional window", () => {
    const ganpati = MH_FESTIVALS.find((f) => f.id === "ganesh-chaturthi")!;
    const others = MH_FESTIVALS.filter((f) => f.id !== "ganesh-chaturthi" && f.id !== "diwali-padwa");
    for (const festival of others) {
      expect(ganpati.rateMultiplier).toBeGreaterThanOrEqual(festival.rateMultiplier);
    }
  });

  it("marks only the solar festivals as fixed-date", () => {
    const fixed = MH_FESTIVALS.filter((f) => f.fixedDate).map((f) => f.id);
    expect(fixed.sort()).toEqual(["makar-sankranti", "shiv-jayanti"]);
  });

  it("gives every festival a plausible window, lead time and category", () => {
    for (const f of MH_FESTIVALS) {
      expect(f.window.fromMonth, f.id).toBeGreaterThanOrEqual(1);
      expect(f.window.toMonth, f.id).toBeLessThanOrEqual(12);
      expect(f.bookingLeadWeeks, f.id).toBeGreaterThan(0);
      expect(f.rateMultiplier, f.id).toBeGreaterThanOrEqual(1);
      expect(f.categories.length, f.id).toBeGreaterThan(0);
      expect(f.why.length, f.id).toBeGreaterThan(20);
    }
  });

  it("only names sub-regions that exist", () => {
    for (const f of MH_FESTIVALS) {
      for (const region of f.strongestIn) {
        expect(Object.keys(SUB_REGIONS), `${f.id} names an unknown sub-region`).toContain(region);
      }
    }
  });
});

describe("upcomingFestivals", () => {
  it("returns festivals ahead of the date, soonest first", () => {
    const list = upcomingFestivals(new Date("2026-11-19T00:00:00Z"));
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].daysAway).toBeGreaterThanOrEqual(list[i - 1].daysAway);
    }
    expect(list[0].daysAway).toBeGreaterThanOrEqual(0);
  });

  it("finds Makar Sankranti next from late November", () => {
    const [next] = upcomingFestivals(new Date("2026-11-19T00:00:00Z"));
    expect(next.festival.id).toBe("makar-sankranti");
    // Mid-January from mid-November.
    expect(next.daysAway).toBeGreaterThan(40);
    expect(next.daysAway).toBeLessThan(75);
  });

  it("subtracts the booking lead time from the days remaining", () => {
    const [next] = upcomingFestivals(new Date("2026-11-19T00:00:00Z"));
    expect(next.daysToBook).toBe(next.daysAway - next.festival.bookingLeadWeeks * 7);
  });

  it("says it is too late once the lead time has run out", () => {
    // A week before Ganesh Chaturthi's window, against an eight-week lead.
    const late = upcomingFestivals(new Date("2026-08-28T00:00:00Z")).find((u) => u.festival.id === "ganesh-chaturthi");
    expect(late?.tooLate).toBe(true);
  });

  it("respects the horizon", () => {
    expect(upcomingFestivals(new Date("2026-11-19T00:00:00Z"), 10)).toHaveLength(0);
  });
});

describe("festivalsForNiche", () => {
  it("points a devotional creator at the religious windows", () => {
    const ids = festivalsForNiche("devotional").map((f) => f.id);
    expect(ids).toContain("ganesh-chaturthi");
    expect(ids).toContain("ashadhi-ekadashi");
  });

  it("points an automotive brand at Gudi Padwa, the state's auspicious buying day", () => {
    expect(festivalsForNiche("automotive").map((f) => f.id)).toContain("gudi-padwa");
  });

  it("returns nothing for a niche with no festival pull", () => {
    expect(festivalsForNiche("gaming")).toEqual([]);
  });
});
