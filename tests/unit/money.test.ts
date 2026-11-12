import { describe, expect, it } from "vitest";
import {
  calculateQuotationTotals,
  compareDecimal,
  formatAUD,
  formatQuantity,
  formatRate,
  tryCalculateQuotationTotals,
} from "@/lib/money";

describe("calculateQuotationTotals", () => {
  it("adds 10% GST to GST-exclusive prices", () => {
    // 120 t of 20 mm aggregate @ $42.50/t + $350 delivery
    const t = calculateQuotationTotals({
      quantity: "120",
      unitRate: "42.50",
      deliveryCost: "350",
      gstTreatment: "exclusive",
    });
    expect(t.lineTotal).toBe("5100.00");
    expect(t.totalExGst).toBe("5450.00");
    expect(t.gstAmount).toBe("545.00");
    expect(t.totalIncGst).toBe("5995.00");
    expect(t.unitRateExGst).toBe("42.5000");
  });

  it("extracts GST (1/11) from GST-inclusive prices", () => {
    const t = calculateQuotationTotals({
      quantity: "10",
      unitRate: "110",
      deliveryCost: "0",
      gstTreatment: "inclusive",
    });
    expect(t.totalIncGst).toBe("1100.00");
    expect(t.gstAmount).toBe("100.00");
    expect(t.totalExGst).toBe("1000.00");
    expect(t.unitRateExGst).toBe("100.0000");
  });

  it("applies no GST to GST-free items", () => {
    const t = calculateQuotationTotals({
      quantity: "3",
      unitRate: "199.99",
      deliveryCost: "15.50",
      gstTreatment: "gst_free",
    });
    expect(t.totalExGst).toBe("615.47");
    expect(t.gstAmount).toBe("0.00");
    expect(t.totalIncGst).toBe("615.47");
  });

  it("avoids floating-point errors (0.1 + 0.2)", () => {
    const t = calculateQuotationTotals({
      quantity: "1",
      unitRate: "0.1",
      deliveryCost: "0.2",
      gstTreatment: "gst_free",
    });
    expect(t.totalExGst).toBe("0.30");
  });

  it("rounds half-cents away from zero", () => {
    // 1.005 → 1.01 (a plain JS toFixed would give 1.00)
    const t = calculateQuotationTotals({
      quantity: "1",
      unitRate: "1.005",
      deliveryCost: "0",
      gstTreatment: "gst_free",
    });
    expect(t.totalExGst).toBe("1.01");
  });

  it("handles fractional quantities and 4-decimal rates", () => {
    const t = calculateQuotationTotals({
      quantity: "35.725",
      unitRate: "268.1234",
      deliveryCost: "0",
      gstTreatment: "exclusive",
    });
    // 35.725 × 268.1234 = 9578.7084650 → 9578.71
    expect(t.totalExGst).toBe("9578.71");
    expect(t.gstAmount).toBe("957.87");
    expect(t.totalIncGst).toBe("10536.58");
  });

  it("always keeps inc = ex + GST exactly", () => {
    const cases = [
      { quantity: "7", unitRate: "13.37", deliveryCost: "0.03" },
      { quantity: "123.456", unitRate: "0.0999", deliveryCost: "12.34" },
      { quantity: "1", unitRate: "0.01", deliveryCost: "0" },
      { quantity: "999", unitRate: "1234.5678", deliveryCost: "4321.09" },
    ];
    for (const c of cases) {
      for (const gstTreatment of ["exclusive", "inclusive", "gst_free"] as const) {
        const t = calculateQuotationTotals({ ...c, gstTreatment });
        const sumCents = Math.round(Number(t.totalExGst) * 100) + Math.round(Number(t.gstAmount) * 100);
        expect(Math.round(Number(t.totalIncGst) * 100)).toBe(sumCents);
      }
    }
  });

  it("treats an empty delivery cost as zero", () => {
    const t = calculateQuotationTotals({ quantity: "2", unitRate: "50", deliveryCost: "", gstTreatment: "exclusive" });
    expect(t.totalExGst).toBe("100.00");
  });

  it("rejects negative or invalid numbers", () => {
    expect(() =>
      calculateQuotationTotals({ quantity: "-1", unitRate: "10", deliveryCost: "0", gstTreatment: "exclusive" }),
    ).toThrow(/negative/);
    expect(() =>
      calculateQuotationTotals({ quantity: "abc", unitRate: "10", deliveryCost: "0", gstTreatment: "exclusive" }),
    ).toThrow(/valid number/);
    expect(tryCalculateQuotationTotals({ quantity: "x", unitRate: "1", deliveryCost: "0", gstTreatment: "exclusive" })).toBeNull();
  });
});

describe("formatting", () => {
  it("formats AUD", () => {
    expect(formatAUD("5995")).toBe("$5,995.00");
    expect(formatAUD(0)).toBe("$0.00");
    expect(formatAUD(null)).toBe("—");
  });

  it("formats rates with up to 4 decimals", () => {
    expect(formatRate("42.5")).toBe("$42.50");
    expect(formatRate("0.1234")).toBe("$0.1234");
  });

  it("formats quantities without trailing zeros", () => {
    expect(formatQuantity("120.000")).toBe("120");
    expect(formatQuantity(1250.5)).toBe("1,250.5");
  });

  it("compares decimals exactly", () => {
    expect(compareDecimal("120.000", 120)).toBe(0);
    expect(compareDecimal("0.30", "0.3")).toBe(0);
    expect(compareDecimal("99.99", "100")).toBe(-1);
  });
});
