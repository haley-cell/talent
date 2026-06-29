import { corsHeaders, jsonResponse } from "../_shared/modelGateway.ts";
import { getSupabaseAdmin, toRun } from "../_shared/db.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [candidatesResult, dealsResult, prospectsResult, runsResult] = await Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: false }).limit(25),
      supabase.from("crm_deals").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("prospects").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("runs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    for (const result of [candidatesResult, dealsResult, prospectsResult, runsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    return jsonResponse({
      candidates: (candidatesResult.data ?? []).map((candidate: Record<string, unknown>) => ({
        id: String(candidate.id),
        name: String(candidate.name ?? "Candidate"),
        title: String(candidate.title ?? "Candidate"),
        source: String(candidate.source_file ?? "CV source"),
        score: Number(candidate.score ?? 0),
        status: String(candidate.review_status ?? "Ready to review"),
        decision: String(candidate.confidence_label ?? "Review"),
        summary: String(candidate.summary ?? "Candidate analysis saved in Supabase."),
        evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
        gaps: Array.isArray(candidate.gaps) ? candidate.gaps : [],
        tags: [],
      })),
      deals: (dealsResult.data ?? []).map((deal: Record<string, unknown>) => ({
        id: String(deal.id),
        company: String(deal.company ?? "Company"),
        owner: String(deal.owner ?? "Unassigned"),
        stage: String(deal.stage ?? "New"),
        value: formatMoney(Number(deal.value ?? 0)),
        lastActivity: deal.last_activity_at ? String(deal.last_activity_at) : "See CRM source",
        probability: Number(deal.probability ?? 50),
        risk: normalizeRisk(deal.risk),
        action: String(deal.recommended_action ?? "Define next step."),
      })),
      prospects: (prospectsResult.data ?? []).map((prospect: Record<string, unknown>) => {
        const payload = typeof prospect.crm_capture_payload === "object" && prospect.crm_capture_payload
          ? prospect.crm_capture_payload as Record<string, unknown>
          : {};
        return {
          id: String(prospect.id),
          name: String(prospect.name ?? "Contact"),
          title: String(prospect.title ?? "Decision maker"),
          company: String(prospect.company ?? "Company"),
          email: String(prospect.email ?? ""),
          source: String(prospect.source ?? "Prospect source"),
          fit: Number(prospect.fit ?? 0),
          status: String(prospect.status ?? "Review"),
          reason: String(prospect.reason ?? "Scored against ICP."),
          nextAction: String(prospect.next_action ?? "Review before outreach."),
          evidence: stringArray(payload.evidence),
          missingData: stringArray(payload.missingData),
        };
      }),
      runs: (runsResult.data ?? []).map(toRun),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});

function normalizeRisk(value: unknown): "High" | "Medium" | "Low" {
  const risk = String(value ?? "").toLowerCase();
  if (risk.includes("high")) return "High";
  if (risk.includes("low")) return "Low";
  return "Medium";
}

function formatMoney(value: number) {
  if (value >= 1000) return `EUR ${Math.round(value / 1000)}k`;
  return `EUR ${Math.round(value)}`;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}
