import { describe, expect, it } from "vitest";
import { commercialStatus } from "./commercial";
import { classifyNiches } from "./niche";

/**
 * On 24 November the Discover page offered "Bhikkhu Gyanjyoti" — an ordained Buddhist monk with
 * 75.7K subscribers, whose channel is entirely Dhamma talks — as a 90/100 match for an electric
 * scooter campaign, tagged "Auto & EVs", priced at ₹6,500, with a button offering to draft his
 * outreach email. Two separate faults produced that, and both are covered here.
 */
describe("the monk on the EV brief", () => {
  // Taken from the live YouTube API response for his channel, not invented.
  const gyanjyoti = {
    name: "Bhikkhu Gyanjyoti",
    handle: "@bhikkhugyanjyoti",
    bio: "बौद्ध धम्म प्रचार और प्रसार के लिए समर्पित चैनल। भगवान बुद्ध और बाबासाहेब आंबेडकर के विचार।",
    keywords: "Pravachan Dhammadesna Dhamma Bhagwan Buddha Babasaheb Ambedkar bauddha dhamma",
    topics: ["Society", "Religion", "Lifestyle_(sociology)"],
  };

  it("is not a bookable creator account", () => {
    const status = commercialStatus(gyanjyoti);
    expect(status.bookable).toBe(false);
    expect(status.kind).toBe("religious");
    expect(status.matched).toBe("bhikkhu");
    expect(status.reason).toMatch(/ordained/);
  });

  it("is never classified into Auto & EVs", () => {
    // The stored record said "auto". Nothing in his metadata is about vehicles: the tag came from
    // substring matching, where a word like "ev" or "car" is found inside an unrelated word.
    const niches = classifyNiches({
      text: `${gyanjyoti.bio} ${gyanjyoti.keywords} धम्म देसना बुद्ध पूर्णिमा प्रवचन dhamma buddha`,
      topicCategories: gyanjyoti.topics,
    });
    expect(niches).not.toContain("automotive");
  });
});

describe("whole-word niche matching", () => {
  it("does not read a niche out of the middle of an unrelated word", () => {
    // "ev" inside "achievement", "car" inside "Ambedkarite", "art" inside "Bharat".
    const niches = classifyNiches({
      text: "An Ambedkarite achievement in Bharat, a devotional channel.",
      topicCategories: [],
    });
    expect(niches).not.toContain("automotive");
  });
});

describe("the line is the vow, not the subject", () => {
  it("leaves a devotional content creator bookable", () => {
    // A bhajan singer or temple vlogger is an ordinary creator and a legitimate brand partner.
    const status = commercialStatus({
      name: "Pune Bhakti Vlogs",
      handle: "@punebhakti",
      bio: "Temple visits, bhajans and festival coverage across Maharashtra.",
    });
    expect(status.bookable).toBe(true);
    expect(status.kind).toBe("creator");
  });

  it("does not catch an ordinary creator whose name contains a title as a surname", () => {
    // "Maharaj" and "Acharya" are common surnames. A bare surname must not disqualify someone.
    for (const name of ["Sneha Acharya", "Rohit Maharaj Patil"]) {
      expect(commercialStatus({ name, bio: "Pune-based food vlogger." }).kind).toBe("creator");
    }
  });
});

describe("other accounts that are not inventory", () => {
  it("excludes news desks, which sell advertising directly", () => {
    const status = commercialStatus({ name: "Lokmat Marathi News", handle: "@lokmatnews", bio: "Latest Maharashtra news." });
    expect(status.bookable).toBe(false);
    expect(status.kind).toBe("news");
  });

  it("excludes official handles", () => {
    const status = commercialStatus({ name: "Pune Municipal Corporation", bio: "Official channel." });
    expect(status.bookable).toBe(false);
    expect(status.kind).toBe("institution");
  });

  it("keeps a creator who merely talks about the news", () => {
    expect(commercialStatus({ name: "Kunal Explains", bio: "I break down the week's headlines for Maharashtra." }).bookable).toBe(true);
  });
});
