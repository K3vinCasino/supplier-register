import { describe, expect, it } from "vitest";
import { sanitizeSearchTerm, toSearchWords } from "@/lib/search";

describe("sanitizeSearchTerm", () => {
  it("removes characters that would break database filters", () => {
    expect(sanitizeSearchTerm("pipe, 375 (RCP)")).toBe("pipe 375 RCP");
    expect(sanitizeSearchTerm("100%*\\")).toBe("100");
    expect(sanitizeSearchTerm(`name.eq.x,"or"`)).toBe("name.eq.x or");
  });

  it("limits length", () => {
    expect(sanitizeSearchTerm("a".repeat(500))).toHaveLength(100);
  });
});

describe("toSearchWords", () => {
  it("splits a phrase into lower-case words", () => {
    expect(toSearchWords("20 mm Aggregate")).toEqual(["20", "mm", "aggregate"]);
  });

  it("makes '20mm' and '20 mm' equivalent", () => {
    expect(toSearchWords("20mm aggregate")).toEqual(toSearchWords("20 mm aggregate"));
    expect(toSearchWords("DN375")).toEqual(["dn", "375"]);
  });

  it("removes duplicates and empty input", () => {
    expect(toSearchWords("  ")).toEqual([]);
    expect(toSearchWords("sand sand")).toEqual(["sand"]);
  });
});
