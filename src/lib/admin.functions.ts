import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AccessInput = z.object({
  userId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "deactivated", "pending"]),
});

const DecisionInput = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(1000).optional(),
});

const CaseInput = z.object({ caseId: z.string().uuid() });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Administrator privileges are required.");
}

/** Grant / revoke platform access. Admin only, audited. */
export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AccessInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: data.status === "approved" ? "access.granted" : "access.revoked",
      entity: "profile",
      entity_id: data.userId,
      detail: `${target?.email ?? data.userId} → ${data.status}`,
    });

    return { ok: true, status: data.status };
  });

/** Approve or reject a generated report. Admin only, audited. Rejection requires a reason. */
export const decideReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DecisionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.decision === "rejected" && !data.reason?.trim()) {
      throw new Error("A rejection reason is required.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("id, title, case_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Report not found.");

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        approval_status: data.decision,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
        approval_note: data.reason?.trim() || null,
      })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: `report.${data.decision}`,
      entity: "report",
      entity_id: data.reportId,
      detail: `${report.title}${data.reason ? ` — ${data.reason}` : ""}`,
    });

    return { ok: true, status: data.decision };
  });

/**
 * Server-side gate for download / share. Returns the report only when an
 * administrator has approved it, so the approval cannot be bypassed by
 * calling an endpoint directly.
 */
export const releaseReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    CaseInput.extend({ intent: z.enum(["download", "share"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS-scoped read: the caller must already be allowed to see this report.
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id, title, approval_status, executive_summary, content, created_at")
      .eq("case_id", data.caseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Report not found.");
    if (report.approval_status !== "approved") {
      throw new Error("This report is awaiting administrator verification.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: `report.${data.intent === "share" ? "shared" : "downloaded"}`,
      entity: "report",
      entity_id: report.id,
      detail: report.title,
    });

    return { ok: true, report };
  });
