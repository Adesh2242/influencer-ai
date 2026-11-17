import { describe, expect, it } from "vitest";
import { detectMaharashtra, looksMarathi } from "./location";

const base = { title: "", description: "", videoTitles: [] as string[] };

describe("detectMaharashtra", () => {
  it("reads a stated home city as strong evidence", () => {
    const verdict = detectMaharashtra({
      ...base,
      title: "Sayali Cooks",
      description: "Home cook based in Pune. New recipe every Sunday.",
    });
    expect(verdict.inMaharashtra).toBe(true);
    expect(verdict.confidence).toBe("strong");
    expect(verdict.place?.name).toBe("Pune");
    expect(verdict.cityId).toBe("pune");
    expect(verdict.evidence[0]).toContain("based in Pune");
  });

  it("treats a pin emoji and a 'City, India' pattern as framing", () => {
    expect(detectMaharashtra({ ...base, description: "📍Nagpur | tech reviews" }).confidence).toBe("strong");
    expect(detectMaharashtra({ ...base, description: "Thane, India. Fitness coach." }).confidence).toBe("strong");
  });

  it("falls back to likely for a bare mention in the bio", () => {
    const verdict = detectMaharashtra({ ...base, description: "Kolhapur chappal reviews and more" });
    expect(verdict.inMaharashtra).toBe(true);
    expect(verdict.confidence).toBe("likely");
    expect(verdict.place?.name).toBe("Kolhapur");
  });

  it("only gives weak confidence when the city appears in video titles alone", () => {
    const verdict = detectMaharashtra({
      title: "Foodie Tales",
      description: "Street food reviews across the country.",
      videoTitles: ["Best vada pav in Mumbai", "Cheapest thali in Delhi"],
    });
    expect(verdict.confidence).toBe("weak");
  });

  it("prefers the most specific place name", () => {
    const verdict = detectMaharashtra({ ...base, description: "Based in Navi Mumbai" });
    expect(verdict.place?.name).toBe("Navi Mumbai");
  });

  it("rules out a channel that declares another country", () => {
    const verdict = detectMaharashtra({
      ...base,
      description: "Marathi food, based in Pune originally",
      country: "US",
    });
    expect(verdict.inMaharashtra).toBe(false);
    expect(verdict.confidence).toBe("none");
    expect(verdict.evidence[0]).toContain("not IN");
  });

  it("ignores an ambiguous name used as an ordinary word", () => {
    const verdict = detectMaharashtra({ ...base, description: "We served bhandara to 500 people" });
    expect(verdict.inMaharashtra).toBe(false);
  });

  it("accepts an ambiguous name when it is framed as a place", () => {
    const verdict = detectMaharashtra({ ...base, description: "Based in Bhandara, Maharashtra" });
    expect(verdict.inMaharashtra).toBe(true);
    expect(verdict.confidence).toBe("strong");
  });

  it("accepts the state on its own", () => {
    const verdict = detectMaharashtra({ ...base, description: "Covering schemes across Maharashtra" });
    expect(verdict.inMaharashtra).toBe(true);
    expect(verdict.place).toBeUndefined();
  });

  it("finds nothing in a channel with no location at all", () => {
    const verdict = detectMaharashtra({ ...base, title: "Daily Tech", description: "Gadget reviews in Hindi" });
    expect(verdict.inMaharashtra).toBe(false);
    expect(verdict.evidence).toEqual([]);
  });
});

describe("looksMarathi", () => {
  it("spots Marathi text", () => {
    expect(looksMarathi("मी पुण्याचा आहे")).toBe(true);
    expect(looksMarathi("मराठी रेसिपी")).toBe(true);
    expect(looksMarathi("Marathi vlogs आहेत")).toBe(true);
  });

  it("does not mistake Hindi for Marathi", () => {
    expect(looksMarathi("मैं दिल्ली से हूँ")).toBe(false);
    expect(looksMarathi("हिंदी में जानकारी")).toBe(false);
  });

  it("is false for plain English", () => {
    expect(looksMarathi("Street food reviews")).toBe(false);
  });
});
