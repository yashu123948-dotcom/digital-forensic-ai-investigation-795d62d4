import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type EvidenceRow = Database["public"]["Tables"]["evidence_files"]["Row"];
export type AgentOutputRow = Database["public"]["Tables"]["agent_outputs"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export const casesQuery = () => ({
  queryKey: ["cases"],
  queryFn: async (): Promise<CaseRow[]> => {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const caseQuery = (caseId: string) => ({
  queryKey: ["case", caseId],
  queryFn: async () => {
    const [caseRes, evidenceRes, outputsRes, reportRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
      supabase
        .from("evidence_files")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at"),
      supabase.from("agent_outputs").select("*").eq("case_id", caseId).order("sequence"),
      supabase.from("reports").select("*").eq("case_id", caseId).maybeSingle(),
    ]);
    if (caseRes.error) throw caseRes.error;
    return {
      caseRow: caseRes.data as CaseRow | null,
      evidence: (evidenceRes.data ?? []) as EvidenceRow[],
      outputs: (outputsRes.data ?? []) as AgentOutputRow[],
      report: (reportRes.data ?? null) as ReportRow | null,
    };
  },
});

export const evidenceQuery = () => ({
  queryKey: ["evidence"],
  queryFn: async (): Promise<(EvidenceRow & { cases: { title: string } | null })[]> => {
    const { data, error } = await supabase
      .from("evidence_files")
      .select("*, cases(title)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (EvidenceRow & { cases: { title: string } | null })[];
  },
});

export const reportsQuery = () => ({
  queryKey: ["reports"],
  queryFn: async (): Promise<(ReportRow & { cases: CaseRow | null })[]> => {
    const { data, error } = await supabase
      .from("reports")
      .select("*, cases(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (ReportRow & { cases: CaseRow | null })[];
  },
});

export const outputsQuery = () => ({
  queryKey: ["agent-outputs"],
  queryFn: async (): Promise<AgentOutputRow[]> => {
    const { data, error } = await supabase
      .from("agent_outputs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
});
