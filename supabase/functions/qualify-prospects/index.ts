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
        "You are the evidence-labeling layer for a prospect qualification operator. Return only JSON. Do not choose the final fit score by feel: label hard gates, five dimension scores, evidence, reason, missing data, and outreach angle. The server computes fit and routing from your labels. Use only supplied ICP, source text, and manual URL.",
      user: JSON.stringify(body),
      schemaHint: {
        prospects: [
          {
            name: "Prospect",
            company: "Company",
            title: "Role",
            email: "email@example.com",
            source: "Source",
            gate: { disqualified: false, reason: "" },
            dimensions: {
              marketFit: 9,
              buyingSignal: 8,
              roleAuthority: 7,
              timing: 6,
              dataCompleteness: 8,
            },
            reason: "Why this matches the ICP",
            missingData: [],
            outreachAngle: "Short angle",
            pipelineWrite: { stage: "review", next_action: "Verify missing data" },
          },
        ],
        evidence: ["Specific finding"],
        quality: "Quality check passed",
      },
    });

    const output = result.output;
    const rawProspects = Array.isArray(output.prospects) ? output.prospects : [];
    const quality = stringValue(output.quality, "Quality check passed");
    const harnessPath = "harness/icm/workspaces/prospect-qualification";
    const supabase = getSupabaseAdmin();

    const prospectRows = rawProspects.map((item, index) => {
      const prospect = typeof item === "object" && item ? item as Record<string, unknown> : {};
      const scoreReceipt = computeProspectScore(prospect);
      const status = routeProspect(scoreReceipt);
      return {
        name: stringValue(prospect.name, `Contact ${index + 1}`),
        title: stringValue(prospect.title, "Decision maker"),
        company: stringValue(prospect.company, `Company ${index + 1}`),
        email: stringValue(prospect.email, ""),
        source: stringValue(prospect.source, body.fileName || body.manualUrl || "Prospect source"),
        fit: scoreReceipt.score,
        status,
        reason: stringValue(prospect.reason, "Scored against supplied ICP."),
        next_action: stringValue(prospect.outreachAngle, stringValue(prospect.nextAction, "Review before outreach.")),
        crm_capture_payload: {
          ...prospect,
          scoreReceipt,
          pipelineWrite: prospect.pipelineWrite ?? { stage: status.toLowerCase(), next_action: "Human review" },
        },
      };
    });

    const insertedProspects = prospectRows.length > 0
      ? await supabase.from("prospects").insert(prospectRows).select()
      : { data: [], error: null };

    if (insertedProspects.error) throw new Error(insertedProspects.error.message);

    const prospects = (insertedProspects.data ?? []).map((prospect: Record<string, unknown>) => ({
      id: String(prospect.id),
      name: String(prospect.name ?? "Contact"),
      title: String(prospect.title ?? "Decision maker"),
      company: String(prospect.company),
      email: String(prospect.email ?? ""),
      source: String(prospect.source ?? "Prospect source"),
      fit: Number(prospect.fit ?? 0),
      status: String(prospect.status ?? "Review"),
      reason: String(prospect.reason ?? "Scored against supplied ICP."),
      nextAction: String(prospect.next_action ?? "Review before outreach."),
    }));

    const captureReady = prospects.filter((prospect) => prospect.status === "Capture now").length;
    const scoreReceipts = prospectRows.map((prospect) => prospect.crm_capture_payload.scoreReceipt);
    const evidence = stringArray(output.evidence);
    const runRecord = await insertRun({
      workflow: "Prospect Qualification",
      input: `${body.fileName || body.manualUrl || "Prospect source"} + ICP definition`,
      result: `${captureReady} capture-ready prospects from ${prospects.length} analyzed records`,
      quality,
      status: prospects.some((prospect) => prospect.status !== "Capture now") ? "Needs review" : "Ready to review",
      evidence,
      dataUsed: [body.fileName || body.manualUrl || "Pasted prospect source", "ICP definition"],
      provider: result.provider,
      harnessPath,
      details: `Prospects were labeled by the configured model, scored deterministically, saved to Supabase, and queued for review. Capture-ready: ${captureReady}/${prospects.length}.`,
      metadata: {
        model: result.model,
        source: "model labels, deterministic ICP score",
        scoreReceipts,
      },
    });

    return jsonResponse({
      workflow: "Prospect Qualification",
      harnessPath,
      provider: result.provider,
      model: result.model,
      mode: result.mode,
      prospects,
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

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function computeProspectScore(prospect: Record<string, unknown>) {
  const gate = typeof prospect.gate === "object" && prospect.gate ? prospect.gate as Record<string, unknown> : {};
  const dimensions = typeof prospect.dimensions === "object" && prospect.dimensions
    ? prospect.dimensions as Record<string, unknown>
    : {};
  const scores = {
    marketFit: clampNumber(dimensions.marketFit, 0, 10, 5),
    buyingSignal: clampNumber(dimensions.buyingSignal, 0, 10, 5),
    roleAuthority: clampNumber(dimensions.roleAuthority, 0, 10, 5),
    timing: clampNumber(dimensions.timing, 0, 10, 5),
    dataCompleteness: clampNumber(dimensions.dataCompleteness, 0, 10, 5),
  };
  const weighted =
    scores.marketFit * 2.5 +
    scores.buyingSignal * 2.5 +
    scores.roleAuthority * 2 +
    scores.timing * 1.5 +
    scores.dataCompleteness * 1.5;
  const disqualified = Boolean(gate.disqualified);
  return {
    score: disqualified ? 0 : Math.round(weighted),
    gate: {
      disqualified,
      reason: stringValue(gate.reason, ""),
    },
    dimensions: scores,
    weights: {
      marketFit: 25,
      buyingSignal: 25,
      roleAuthority: 20,
      timing: 15,
      dataCompleteness: 15,
    },
  };
}

function routeProspect(scoreReceipt: ReturnType<typeof computeProspectScore>) {
  if (scoreReceipt.gate.disqualified) return "Review";
  if (scoreReceipt.score >= 85) return "Capture now";
  if (scoreReceipt.score >= 70) return "Review";
  return "Nurture";
}
