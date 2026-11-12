/**
 * TypeScript description of the database, in the format Supabase expects.
 * It lets the editor and compiler check every query.
 *
 * This file was written by hand to match supabase/migrations. Once your
 * Supabase project exists you can regenerate it automatically with:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
 *
 * Note: Postgres `numeric` columns are returned as JSON numbers. We send
 * strings when writing so no precision is lost.
 */

import type { GstTreatment, RfqStatus } from "@/lib/constants";

type Numeric = number;
type NumericInput = number | string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      supplier_categories: {
        Row: { id: number; name: string; sort_order: number };
        Insert: { name: string; sort_order?: number };
        Update: { name?: string; sort_order?: number };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: number;
          owner_id: string;
          company_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          service_area: string | null;
          materials_supplied: string | null;
          notes: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id?: string;
          company_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          service_area?: string | null;
          materials_supplied?: string | null;
          notes?: string | null;
          is_archived?: boolean;
        };
        Update: {
          company_name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          service_area?: string | null;
          materials_supplied?: string | null;
          notes?: string | null;
          is_archived?: boolean;
        };
        Relationships: [];
      };
      supplier_category_links: {
        Row: { supplier_id: number; category_id: number };
        Insert: { supplier_id: number; category_id: number };
        Update: { supplier_id?: number; category_id?: number };
        Relationships: [
          {
            foreignKeyName: "supplier_category_links_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_category_links_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "supplier_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      rfqs: {
        Row: {
          id: number;
          owner_id: string;
          project_name: string;
          title: string;
          description: string;
          quantity: Numeric;
          unit: string;
          date_requested: string;
          required_by: string | null;
          status: RfqStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id?: string;
          project_name: string;
          title: string;
          description: string;
          quantity: NumericInput;
          unit: string;
          date_requested?: string;
          required_by?: string | null;
          status?: RfqStatus;
          notes?: string | null;
        };
        Update: {
          project_name?: string;
          title?: string;
          description?: string;
          quantity?: NumericInput;
          unit?: string;
          date_requested?: string;
          required_by?: string | null;
          status?: RfqStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      quotations: {
        Row: {
          id: number;
          owner_id: string;
          rfq_id: number;
          supplier_id: number;
          quote_reference: string | null;
          date_received: string;
          description: string;
          quantity: Numeric;
          unit: string;
          unit_rate: Numeric;
          delivery_cost: Numeric;
          gst_treatment: GstTreatment;
          unit_rate_ex_gst: Numeric;
          total_ex_gst: Numeric;
          gst_amount: Numeric;
          total_inc_gst: Numeric;
          lead_time: string | null;
          valid_until: string | null;
          scope_complete: boolean;
          notes: string | null;
          is_awarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id?: string;
          rfq_id: number;
          supplier_id: number;
          quote_reference?: string | null;
          date_received?: string;
          description: string;
          quantity: NumericInput;
          unit: string;
          unit_rate: NumericInput;
          delivery_cost?: NumericInput;
          gst_treatment: GstTreatment;
          unit_rate_ex_gst: NumericInput;
          total_ex_gst: NumericInput;
          gst_amount: NumericInput;
          total_inc_gst: NumericInput;
          lead_time?: string | null;
          valid_until?: string | null;
          scope_complete?: boolean;
          notes?: string | null;
          is_awarded?: boolean;
        };
        Update: {
          supplier_id?: number;
          quote_reference?: string | null;
          date_received?: string;
          description?: string;
          quantity?: NumericInput;
          unit?: string;
          unit_rate?: NumericInput;
          delivery_cost?: NumericInput;
          gst_treatment?: GstTreatment;
          unit_rate_ex_gst?: NumericInput;
          total_ex_gst?: NumericInput;
          gst_amount?: NumericInput;
          total_inc_gst?: NumericInput;
          lead_time?: string | null;
          valid_until?: string | null;
          scope_complete?: boolean;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_rfq_id_fkey";
            columns: ["rfq_id"];
            isOneToOne: false;
            referencedRelation: "rfqs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      price_history: {
        Row: {
          quotation_id: number;
          owner_id: string;
          date_received: string;
          description: string;
          quantity: Numeric;
          unit: string;
          unit_rate: Numeric;
          unit_rate_ex_gst: Numeric;
          delivery_cost: Numeric;
          gst_treatment: GstTreatment;
          total_ex_gst: Numeric;
          total_inc_gst: Numeric;
          lead_time: string | null;
          valid_until: string | null;
          quote_reference: string | null;
          is_awarded: boolean;
          supplier_id: number;
          supplier_name: string;
          rfq_id: number;
          rfq_title: string;
          project_name: string;
          search_text: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      set_supplier_categories: {
        Args: { p_supplier_id: number; p_category_ids: number[] };
        Returns: undefined;
      };
      award_quotation: {
        Args: { p_quotation_id: number };
        Returns: undefined;
      };
      clear_award: {
        Args: { p_rfq_id: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];

export type Supplier = Tables<"suppliers">;
export type SupplierCategory = Tables<"supplier_categories">;
export type Rfq = Tables<"rfqs">;
export type Quotation = Tables<"quotations">;
export type PriceHistoryRow = Views<"price_history">;
