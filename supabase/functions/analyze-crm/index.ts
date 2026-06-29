import { callModelGateway, corsHeaders, jsonResponse } from "../_shared/modelGateway.ts";
import { getSupabaseAdmin, insertRun, toRun } from "../_shared/db.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await callModelGateway({
      system:
        "You analyze CRM deal rows as a pipeline operator. Return only JSON. Find stalled deals, missing next steps, revenue at risk, concise owner actions, and exact pipeline writes. Use only supplied CRM data. Every priority action must end in a concrete field update or owner next step.",
      user: JSON.stringify(body),
      schemaHint: {
        activePipeline: "EUR 312k",
        dealsNeedingAction: 12,
        revenueAtRisk: "EUR 74k",
        priorityActions: [
          {
            company: "Company",
            owner: "Owner",
            stage: "Stage",
            value: "EUR 42000",
            lastActivity: "21 days",
            probability: 68,
            risk: "High",
            action: "Recommended next step",
            pipelineWrite: {
              stage: "Proposal",
              risk: "High",
              next_action: "Owner follow-up due today",
              review_status: "Ready to review",
            },
          },
        ],
        evidence: ["Specific finding"],
        quality: "Quality check passed",
      },
    });

    const output = result.output;
    const actions = Array.isArray(output.priorityActions) ? output.priorityActions : [];
    const quality = stringValue(output.quality, "Quality check passed");
    const harnessPath = "harness/icm/workspaces/crm-pipeline-optimizer";
    const supabase = getSupabaseAdmin();

    const dealRows = actions.map((item, index) => {
      const action = typeof item === "object" && item ? item as Record<string, unknown> : {};
      return {
        company: stringValue(action.company, `Deal ${index + 1}`),
        owner: stringValue(action.owner, "Unassigned"),
        stage: stringValue(action.stage, "New"),
        value: numericValue(action.value, 0),
        last_activity_at: null,
        probability: clampNumber(action.probability, 0, 100, 50),
        risk: normalizeRisk(action.risk),
        recommended_action: stringValue(action.action, "Define the next step with the owner."),
        source_file: body.fileName || "Pasted CRM CSV",
      };
    });

    const insertedDeals = dealRows.length > 0
      ? await supabase.from("crm_deals").insert(dealRows).select()
      : { data: [], error: null };

    if (insertedDeals.error) throw new Error(insertedDeals.error.message);

    const deals = (insertedDeals.data ?? []).map((deal: Record<string, unknown>) => ({
      id: String(deal.id),
      company: String(deal.company),
      owner: String(deal.owner ?? "Unassigned"),
      stage: String(deal.stage ?? "New"),
      value: formatMoney(Number(deal.value ?? 0)),
      lastActivity: "See CRM source",
      probability: Number(deal.probability ?? 50),
      risk: normalizeRisk(deal.risk),
      action: String(deal.recommended_action ?? "Define next step."),
    }));

    const evidence = stringArray(output.evidence);
    const resultSummary = `${deals.filter((deal) => deal.risk !== "Low").length} deals need action`;
    const runRecord = await insertRun({
      workflow: "CRM Analysis",
      input: `${body.fileName || "Pasted CRM CSV"} with mapped fields`,
      result: resultSummary,
      quality,
      status: quality.toLowerCase().includes("issue") ? "Issue found" : "Ready to review",
      evidence,
      dataUsed: [body.fileName || "Pasted CRM CSV"],
      provider: result.provider,
      harnessPath,
      details: "CRM rows were analyzed by the configured model and converted into owner-level next steps.",
      metadata: {
        model: result.model,
        source: "pipeline operator field-write contract",
        activePipeline: output.activePipeline,
        dealsNeedingAction: output.dealsNeedingAction,
        revenueAtRisk: output.revenueAtRisk,
        pipelineWrites: actions.map((item) => typeof item === "object" && item ? (item as Record<string, unknown>).pipelineWrite : null),
      },
    });

    return jsonResponse({
      workflow: "CRM Analysis",
      harnessPath,
      provider: result.provider,
      model: result.model,
      mode: result.mode,
      deals,
      pipeline: buildPipeline(deals),
      run: toRun(runRecord),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function numericValue(value: unknown, fallback: number) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const number = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }
  return fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

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

function buildPipeline(deals: Array<{ stage: string; risk: "High" | "Medium" | "Low" }>) {
  const stages = ["New", "Qualified", "Proposal", "Negotiation", "Won"].map((stage) => ({
    stage,
    value: 0,
    stalled: 0,
  }));
  const byStage = new Map(stages.map((stage) => [stage.stage.toLowerCase(), stage]));

  deals.forEach((deal) => {
    const key = deal.stage.toLowerCase();
    const point = byStage.get(key) ?? { stage: deal.stage, value: 0, stalled: 0 };
    point.value += 1;
    if (deal.risk !== "Low") point.stalled += 1;
    byStage.set(key, point);
  });

  return [...byStage.values()];
}
