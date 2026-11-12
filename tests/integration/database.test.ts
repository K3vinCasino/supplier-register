/**
 * Live database tests — run against a real Supabase project.
 *
 * These are SKIPPED unless the following are set in `.env.test.local`:
 *   TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY,
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD
 *
 * Use a development project (not production). The tests create their own
 * records, prefixed "[TEST]", and delete them afterwards.
 *
 * They verify:
 *   - anonymous visitors cannot read or write any business data (RLS)
 *   - a logged-in user can create suppliers, RFQs and quotations
 *   - the database rejects inconsistent totals
 *   - only one quotation per RFQ can be awarded
 *   - the price_history view and search work
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateQuotationTotals } from "@/lib/money";

config({ path: ".env.test.local" });

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const enabled = Boolean(url && key && email && password);

const newClient = () =>
  createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

describe.skipIf(!enabled)("Supabase database + Row Level Security", () => {
  let anon: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  const stamp = `[TEST] ${Date.now()}`;
  const created = { supplierIds: [] as number[], rfqIds: [] as number[] };

  beforeAll(async () => {
    anon = newClient();
    user = newClient();
    const { error } = await user.auth.signInWithPassword({ email: email!, password: password! });
    if (error) throw new Error(`Test login failed: ${error.message}`);
  });

  afterAll(async () => {
    if (!user) return;
    if (created.rfqIds.length) {
      await user.from("quotations").delete().in("rfq_id", created.rfqIds);
      await user.from("rfqs").delete().in("id", created.rfqIds);
    }
    if (created.supplierIds.length) await user.from("suppliers").delete().in("id", created.supplierIds);
    await user.auth.signOut();
  });

  describe("anonymous visitor", () => {
    it.each(["suppliers", "rfqs", "quotations", "supplier_category_links", "supplier_categories"] as const)(
      "cannot read %s",
      async (table) => {
        const { data, error } = await anon.from(table).select("*").limit(5);
        // Either a permission error, or zero rows — never real data.
        expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
      },
    );

    it("cannot read the price_history view", async () => {
      const { data, error } = await anon.from("price_history").select("*").limit(5);
      expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
    });

    it("cannot create a supplier", async () => {
      const { error } = await anon.from("suppliers").insert({ company_name: `${stamp} anon` });
      expect(error).not.toBeNull();
    });

    it("cannot call database functions", async () => {
      const { error } = await anon.rpc("award_quotation", { p_quotation_id: 1 });
      expect(error).not.toBeNull();
    });
  });

  describe("logged-in user", () => {
    let supplierA: number;
    let supplierB: number;
    let rfqId: number;

    it("can create suppliers with categories", async () => {
      const { data: cats } = await user.from("supplier_categories").select("id, name");
      expect(cats?.length).toBeGreaterThan(0);

      const a = await user.from("suppliers").insert({ company_name: `${stamp} Quarry A` }).select("id").single();
      const b = await user.from("suppliers").insert({ company_name: `${stamp} Quarry B` }).select("id").single();
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      supplierA = a.data!.id;
      supplierB = b.data!.id;
      created.supplierIds.push(supplierA, supplierB);

      const { error } = await user.rpc("set_supplier_categories", {
        p_supplier_id: supplierA,
        p_category_ids: [cats![0].id],
      });
      expect(error).toBeNull();
      const { data: links } = await user.from("supplier_category_links").select("*").eq("supplier_id", supplierA);
      expect(links).toHaveLength(1);
    });

    it("rejects duplicate supplier names (case-insensitive)", async () => {
      const { error } = await user.from("suppliers").insert({ company_name: `${stamp} QUARRY A`.toLowerCase() });
      expect(error?.code).toBe("23505");
    });

    it("can create an RFQ and quotations", async () => {
      const rfq = await user
        .from("rfqs")
        .insert({
          project_name: `${stamp} Project`,
          title: `${stamp} 20mm aggregate`,
          description: "Supply 20 mm aggregate",
          quantity: "120",
          unit: "t",
          status: "Sent",
        })
        .select("id")
        .single();
      expect(rfq.error).toBeNull();
      rfqId = rfq.data!.id;
      created.rfqIds.push(rfqId);

      for (const [supplier_id, rate] of [
        [supplierA, "42.50"],
        [supplierB, "39.80"],
      ] as const) {
        const t = calculateQuotationTotals({ quantity: "120", unitRate: rate, deliveryCost: "350", gstTreatment: "exclusive" });
        const { error } = await user.from("quotations").insert({
          rfq_id: rfqId,
          supplier_id,
          description: "20 mm aggregate delivered",
          quantity: "120",
          unit: "t",
          unit_rate: rate,
          delivery_cost: "350",
          gst_treatment: "exclusive",
          unit_rate_ex_gst: t.unitRateExGst,
          total_ex_gst: t.totalExGst,
          gst_amount: t.gstAmount,
          total_inc_gst: t.totalIncGst,
        });
        expect(error).toBeNull();
      }
    });

    it("rejects totals that do not add up", async () => {
      const { error } = await user.from("quotations").insert({
        rfq_id: rfqId,
        supplier_id: supplierA,
        description: "bad totals",
        quantity: "1",
        unit: "t",
        unit_rate: "100",
        gst_treatment: "exclusive",
        unit_rate_ex_gst: "100",
        total_ex_gst: "100.00",
        gst_amount: "10.00",
        total_inc_gst: "999.00",
      });
      expect(error?.code).toBe("23514");
    });

    it("finds quotations in price history search", async () => {
      const { data, error } = await user
        .from("price_history")
        .select("*")
        .eq("rfq_id", rfqId)
        .ilike("search_text", "%aggregate%");
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it("allows only one awarded quotation per RFQ", async () => {
      const { data: quotes } = await user.from("quotations").select("id").eq("rfq_id", rfqId).order("id");
      const [q1, q2] = quotes!;

      expect((await user.rpc("award_quotation", { p_quotation_id: q1.id })).error).toBeNull();
      expect((await user.rpc("award_quotation", { p_quotation_id: q2.id })).error).toBeNull();

      const { data: awarded } = await user.from("quotations").select("id").eq("rfq_id", rfqId).eq("is_awarded", true);
      expect(awarded).toEqual([{ id: q2.id }]);

      const { data: rfq } = await user.from("rfqs").select("status").eq("id", rfqId).single();
      expect(rfq?.status).toBe("Awarded");

      // Directly setting a second award is blocked by the unique index
      const { error } = await user.from("quotations").update({ is_awarded: true } as never).eq("id", q1.id);
      expect(error?.code).toBe("23505");
    });

    it("cannot delete a supplier that has quotations", async () => {
      const { error } = await user.from("suppliers").delete().eq("id", supplierA);
      expect(["23001", "23503"]).toContain(error?.code);
    });
  });
});

describe.runIf(!enabled)("Supabase database tests", () => {
  it.skip("skipped — set TEST_* variables in .env.test.local to run live database tests", () => {});
});
