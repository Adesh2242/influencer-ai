import { describe, expect, it } from "vitest";
import { commercialStatus } from "./commercial";
import { classifyNiches, substringOnlyNiches } from "./niche";

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

/**
 * Twelve news channels were still being served after the first fix, because a handle has no spaces:
 * whole-word matching cannot see "news" inside "news18marathi". All of these are real handles taken
 * from the live catalogue.
 */
describe("news channels whose handle has no word boundaries", () => {
  const realHandles: [string, string][] = [
    ["News18 Marathi", "news18marathi"],
    ["ucnnewslive", "ucnnewslive"],
    ["channel B", "channelbnews"],
    ["Pune Live पुणे लाईव्ह", "punelivenews2019"],
    ["rrcnewsakola", "rrcnews_akola"],
    ["News11 Maharashtra", "news11maharashtra54"],
    ["Raigad Times Digital ", "raigadtimesnews"],
    ["My Marathi", "mymarathinews"],
    ["नव महाराष्ट्र NETWORK", "navmaharashtranewsnetwork"],
  ];

  for (const [name, handle] of realHandles) {
    it(`excludes ${name}`, () => {
      expect(commercialStatus({ name, handle }).kind).toBe("news");
    });
  }

  it("still excludes the short broadcaster tokens as whole words", () => {
    expect(commercialStatus({ name: "Zee 24 Taas", handle: "@zee24taas" }).kind).toBe("news");
    expect(commercialStatus({ name: "ABP Majha", handle: "@abpmajha" }).kind).toBe("news");
  });

  it("does not catch a person whose name merely contains one of them", () => {
    // "zee" inside "Zeeshan", "saam" inside "Saamna" — the reason those are not substring-matched.
    expect(commercialStatus({ name: "Zeeshan Khan Vlogs", handle: "@zeeshankhan" }).kind).toBe("creator");
    expect(commercialStatus({ name: "Saamna Comedy", handle: "@saamnacomedy" }).kind).toBe("creator");
  });

  it("excludes a police-recruitment coaching account", () => {
    expect(commercialStatus({ name: "YJ Academy - Police Bharti ", handle: "@yjacademy" }).kind).toBe("institution");
  });
});

describe("repairing niche tags already stored", () => {
  it("strips automotive from a Marathi cooking channel that only ever said नमस्कार", () => {
    // Sarita's Kitchen, live in the catalogue: bio "नमस्कार मित्र आणि मैत्रिणींनो", tagged automotive.
    // नमस्कार ends in कार — "car" — which is the whole of the evidence.
    const text = "नमस्कार मित्र आणि मैत्रिणींनो saritas kitchen marathi diwali faral recipes besan ladoo recipe";
    expect(substringOnlyNiches(text, ["food", "lifestyle", "automotive"])).toEqual(["automotive"]);
  });

  it("keeps a tag that has real whole-word evidence", () => {
    const text = "Bike reviews and car first drives across Maharashtra. नमस्कार!";
    expect(substringOnlyNiches(text, ["automotive"])).toEqual([]);
  });

  it("keeps a tag with no keyword evidence either way, since it came from a YouTube topic", () => {
    expect(substringOnlyNiches("just some words", ["automotive", "food"])).toEqual([]);
  });
});

describe("niches are judged against real YouTube topics, not guessed", () => {
  it("classifies a cooking channel as food even though its bio says नमस्कार", () => {
    // Sarita's Kitchen, with the topicDetails YouTube actually returns for a cooking channel.
    const niches = classifyNiches({
      text: "नमस्कार मित्र आणि मैत्रिणींनो diwali faral recipes besan ladoo recipe saritas kitchen marathi",
      topicCategories: ["https://en.wikipedia.org/wiki/Food", "https://en.wikipedia.org/wiki/Lifestyle_(sociology)"],
    });
    expect(niches).toContain("food");
    expect(niches).not.toContain("automotive");
  });

  it("still classifies a genuine motovlogger as automotive", () => {
    // Z900 Rider, live in the catalogue: the tag was right for him all along.
    const niches = classifyNiches({
      text: "hey guys i am a bike rider from mumbai, india. i ride superbikes",
      topicCategories: ["https://en.wikipedia.org/wiki/Vehicle"],
    });
    expect(niches).toContain("automotive");
  });

  it("gives a channel no niche rather than a wrong one when nothing matches", () => {
    expect(classifyNiches({ text: "नमस्कार मंडळी", topicCategories: [] })).toEqual([]);
  });
});
