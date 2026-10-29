import { describe, expect, it } from "vitest";
import { joinWithAnd } from "./text";

describe("joinWithAnd", () => {
  it("joins lists the way a sentence would", () => {
    expect(joinWithAnd([])).toBe("");
    expect(joinWithAnd(["Tamil"])).toBe("Tamil");
    expect(joinWithAnd(["Tamil", "Telugu"])).toBe("Tamil and Telugu");
    expect(joinWithAnd(["Tamil", "Telugu", "Kannada"])).toBe("Tamil, Telugu and Kannada");
  });
});
