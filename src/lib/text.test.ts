import { describe, expect, it } from "vitest";
import { safeSlice, wellFormed, wellFormedDeep, containsWord, startsWithWord} from "./text";

/**
 * These cover a bug that killed an ingest run of 149 creators: a bio was sliced through the middle
 * of an emoji, leaving a lone surrogate that Postgres refused as invalid JSON.
 */
const EMOJI = "🏴"; // two UTF-16 code units
const HIGH = "\uD83C";
const LOW = "\uDFF4";

describe("wellFormed", () => {
  it("leaves ordinary text alone", () => {
    expect(wellFormed("Pune food vlog")).toBe("Pune food vlog");
    expect(wellFormed("मराठी रेसिपी")).toBe("मराठी रेसिपी");
  });

  it("keeps a complete emoji intact", () => {
    expect(wellFormed(`Based in Pune ${EMOJI}`)).toBe(`Based in Pune ${EMOJI}`);
  });

  it("replaces a lone high surrogate", () => {
    const repaired = wellFormed(`abc${HIGH}`);
    expect(repaired).not.toContain(HIGH);
    expect(repaired).toBe("abc�");
  });

  it("replaces a lone low surrogate, the case that broke the run", () => {
    const repaired = wellFormed(`${LOW}abc`);
    expect(repaired).toBe("�abc");
  });

  it("produces something JSON.stringify can round-trip through JSON.parse", () => {
    const broken = `Bio: "…${LOW} Satara"`;
    expect(() => JSON.parse(JSON.stringify(wellFormed(broken)))).not.toThrow();
  });
});

describe("safeSlice", () => {
  it("never leaves half an emoji behind", () => {
    const text = `Pune ${EMOJI} food`;
    // Cut one code unit into the emoji.
    const cut = safeSlice(text, 0, text.indexOf(EMOJI) + 1);
    expect(cut).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    expect(() => JSON.parse(JSON.stringify(cut))).not.toThrow();
  });

  it("slices ordinary text as String.slice would", () => {
    expect(safeSlice("abcdef", 1, 4)).toBe("bcd");
    expect(safeSlice("abcdef", 2)).toBe("cdef");
  });
});

describe("wellFormedDeep", () => {
  it("repairs strings nested in objects and arrays", () => {
    const record = {
      name: `Creator${HIGH}`,
      location: { evidence: [`Bio: ${LOW}`, "clean"] },
      followers: 1000,
      verified: false,
      missing: null,
    };
    const clean = wellFormedDeep(record);
    expect(clean.name).toBe("Creator�");
    expect(clean.location.evidence[0]).toBe("Bio: �");
    expect(clean.location.evidence[1]).toBe("clean");
  });

  it("leaves non-string values as they are", () => {
    const clean = wellFormedDeep({ followers: 1000, verified: false, missing: null });
    expect(clean).toEqual({ followers: 1000, verified: false, missing: null });
  });

  it("makes a whole record safe to stringify for Postgres", () => {
    const record = { bio: `Satara ${LOW}`, topics: [`pune${HIGH}`] };
    const json = JSON.stringify(wellFormedDeep(record));
    expect(json).not.toMatch(/\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

/**
 * Devanagari joins consonants with a virama, which Unicode classifies as a combining mark rather
 * than a letter. A word-boundary class of just letters and digits therefore treats the virama as
 * a space: नमस्कार reads as "नमस्" + "कार", and "कार" — "car" — matches as a whole word. That put
 * 136 Marathi creators under "Auto & EVs" for greeting their audience, and it survived inside the
 * first attempt at the fix.
 */
describe("word boundaries in Devanagari", () => {
  it("does not find कार inside नमस्कार", () => {
    expect(containsWord("नमस्कार मित्र आणि मैत्रिणींनो", "कार")).toBe(false);
  });

  it("does not find कार inside प्रचार or प्रसार", () => {
    expect(containsWord("बौद्ध धम्म प्रचार आणि प्रसार", "कार")).toBe(false);
  });

  it("still finds a genuine Devanagari word", () => {
    expect(containsWord("गाडी रिव्ह्यू आणि बाइक टेस्ट", "गाडी")).toBe(true);
    expect(containsWord("नमस्कार", "नमस्कार")).toBe(true);
  });

  it("still works on Latin script", () => {
    expect(containsWord("bike and car reviews", "car")).toBe(true);
    expect(containsWord("an Ambedkarite achievement", "car")).toBe(false);
    expect(containsWord("an Ambedkarite achievement", "ev")).toBe(false);
  });

  it("treats a leading honorific as leading, and a surname as not", () => {
    expect(startsWithWord("Bhadant Rahul", "bhadant")).toBe(true);
    expect(startsWithWord("Sneha Acharya", "acharya")).toBe(false);
    expect(startsWithWord("भदंत राहुल", "भदंत")).toBe(true);
  });
});
