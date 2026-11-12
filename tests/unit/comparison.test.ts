import { describe, expect, it } from "vitest";
import { analyseComparison, type ComparisonQuote } from "@/lib/comparison";

const rfq = { quantity: 120, unit: "t" };

function quote(overrides: Partial<ComparisonQuote> & { id: number }): ComparisonQuote {
  return {
    supplierName: `Supplier ${overrides.id}`,
    quantity: 120,
    unit: "t",
    gstTreatment: "exclusive",
    scopeComplete: true,
    totalExGst: 1000,
    ...overrides,
  };
}

describe("analyseComparison", () => {
  it("highlights the cheapest like-for-like quote", () => {
    const r = analyseComparison(rfq, [
      quote({ id: 1, totalExGst: 5450 }),
      quote({ id: 2, totalExGst: 5120.5 }),
      quote({ id: 3, totalExGst: 6010 }),
    ]);
    expect(r.comparable).toBe(true);
    expect(r.cheapestIds).toEqual([2]);
    expect(r.reasons).toEqual([]);
  });

  it("treats inclusive and exclusive entry as comparable (both taxable)", () => {
    const r = analyseComparison(rfq, [
      quote({ id: 1, gstTreatment: "exclusive", totalExGst: 1000 }),
      quote({ id: 2, gstTreatment: "inclusive", totalExGst: 990 }),
    ]);
    expect(r.comparable).toBe(true);
    expect(r.cheapestIds).toEqual([2]);
  });

  it("returns all tied cheapest quotes", () => {
    const r = analyseComparison(rfq, [
      quote({ id: 1, totalExGst: "1000.00" }),
      quote({ id: 2, totalExGst: 1000 }),
      quote({ id: 3, totalExGst: 1200 }),
    ]);
    expect(r.cheapestIds).toEqual([1, 2]);
  });

  it("does not highlight when a unit differs", () => {
    const r = analyseComparison(rfq, [quote({ id: 1 }), quote({ id: 2, unit: "m3", totalExGst: 1 })]);
    expect(r.comparable).toBe(false);
    expect(r.cheapestIds).toEqual([]);
    expect(r.reasons.join(" ")).toMatch(/m³/);
  });

  it("does not highlight when a quantity differs", () => {
    const r = analyseComparison(rfq, [quote({ id: 1 }), quote({ id: 2, quantity: 60, totalExGst: 1 })]);
    expect(r.comparable).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/quantity/);
  });

  it("treats 120 and '120.000' as the same quantity", () => {
    const r = analyseComparison(rfq, [quote({ id: 1, quantity: "120.000" }), quote({ id: 2, totalExGst: 900 })]);
    expect(r.comparable).toBe(true);
  });

  it("does not highlight when scope is partial", () => {
    const r = analyseComparison(rfq, [quote({ id: 1 }), quote({ id: 2, scopeComplete: false, totalExGst: 1 })]);
    expect(r.comparable).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/scope/);
  });

  it("does not highlight a mix of GST-free and taxable quotes", () => {
    const r = analyseComparison(rfq, [quote({ id: 1 }), quote({ id: 2, gstTreatment: "gst_free", totalExGst: 1 })]);
    expect(r.comparable).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/GST/);
  });

  it("needs at least two quotes", () => {
    expect(analyseComparison(rfq, []).comparable).toBe(false);
    const one = analyseComparison(rfq, [quote({ id: 1 })]);
    expect(one.comparable).toBe(false);
    expect(one.cheapestIds).toEqual([]);
  });
});
