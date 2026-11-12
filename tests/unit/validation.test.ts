import { describe, expect, it } from "vitest";
import { quotationSchema, rfqSchema, supplierSchema } from "@/lib/validation";
import { formDataToObject } from "@/lib/forms";

describe("supplierSchema", () => {
  it("accepts a minimal supplier and converts blanks to null", () => {
    const r = supplierSchema.parse({ company_name: "  Boral Quarries ", email: "", phone: "" });
    expect(r.company_name).toBe("Boral Quarries");
    expect(r.email).toBeNull();
    expect(r.phone).toBeNull();
    expect(r.category_ids).toEqual([]);
  });

  it("requires a company name", () => {
    expect(supplierSchema.safeParse({ company_name: "  " }).success).toBe(false);
  });

  it("validates and normalises email and website", () => {
    const r = supplierSchema.parse({ company_name: "X", email: "Quotes@Supplier.com.au", website: "www.supplier.com.au" });
    expect(r.email).toBe("quotes@supplier.com.au");
    expect(r.website).toBe("https://www.supplier.com.au");
    expect(supplierSchema.safeParse({ company_name: "X", email: "not-an-email" }).success).toBe(false);
    expect(supplierSchema.safeParse({ company_name: "X", website: "javascript:alert(1)" }).success).toBe(false);
  });

  it("validates phone characters", () => {
    expect(supplierSchema.safeParse({ company_name: "X", phone: "(02) 9876 5432" }).success).toBe(true);
    expect(supplierSchema.safeParse({ company_name: "X", phone: "+61 412 345 678" }).success).toBe(true);
    expect(supplierSchema.safeParse({ company_name: "X", phone: "call me" }).success).toBe(false);
  });

  it("parses category checkboxes from FormData", () => {
    const fd = new FormData();
    fd.append("company_name", "Holcim");
    fd.append("category_ids", "1");
    fd.append("category_ids", "3");
    const r = supplierSchema.parse(formDataToObject(fd, ["category_ids"]));
    expect(r.category_ids).toEqual([1, 3]);
  });
});

describe("rfqSchema", () => {
  const valid = {
    project_name: "M12 Motorway Stage 2",
    title: "DGB20 road base",
    description: "Supply and deliver DGB20 to site",
    quantity: "1,250.5",
    unit: "t",
    date_requested: "2026-11-11",
    required_by: "",
    status: "Draft",
    notes: "",
  };

  it("accepts valid input and cleans numbers", () => {
    const r = rfqSchema.parse(valid);
    expect(r.quantity).toBe("1250.5");
    expect(r.required_by).toBeNull();
  });

  it("rejects bad quantity, unit, status and dates", () => {
    expect(rfqSchema.safeParse({ ...valid, quantity: "0" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, quantity: "1.2345" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, unit: "bananas" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, status: "Lost" }).success).toBe(false);
    expect(rfqSchema.safeParse({ ...valid, date_requested: "2026-02-30" }).success).toBe(false);
  });

  it("rejects a required date before the request date", () => {
    const r = rfqSchema.safeParse({ ...valid, required_by: "2026-11-01" });
    expect(r.success).toBe(false);
  });
});

describe("quotationSchema", () => {
  const valid = {
    rfq_id: "4",
    supplier_id: "7",
    quote_reference: "Q-1001",
    date_received: "2026-11-11",
    description: "20 mm aggregate",
    quantity: "120",
    unit: "t",
    unit_rate: "$42.50",
    delivery_cost: "",
    gst_treatment: "exclusive",
    lead_time: "2 days",
    valid_until: "2026-12-31",
    scope_complete: "on",
    notes: "",
  };

  it("accepts valid input", () => {
    const r = quotationSchema.parse(valid);
    expect(r.rfq_id).toBe(4);
    expect(r.supplier_id).toBe(7);
    expect(r.unit_rate).toBe("42.50");
    expect(r.delivery_cost).toBe("0");
    expect(r.scope_complete).toBe(true);
  });

  it("treats a missing checkbox as unticked", () => {
    const { scope_complete: _omit, ...rest } = valid;
    void _omit;
    expect(quotationSchema.parse(rest).scope_complete).toBe(false);
  });

  it("requires a supplier and a valid GST treatment", () => {
    expect(quotationSchema.safeParse({ ...valid, supplier_id: "" }).success).toBe(false);
    expect(quotationSchema.safeParse({ ...valid, gst_treatment: "maybe" }).success).toBe(false);
  });

  it("rejects negative or malformed money", () => {
    expect(quotationSchema.safeParse({ ...valid, unit_rate: "-5" }).success).toBe(false);
    expect(quotationSchema.safeParse({ ...valid, delivery_cost: "12.345" }).success).toBe(false);
    expect(quotationSchema.safeParse({ ...valid, unit_rate: "1e5" }).success).toBe(false);
  });
});
