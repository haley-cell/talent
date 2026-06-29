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
        "You are the neutral evidence-labeling layer for a recruiting operator. Return only JSON. Do not choose the final score by feel: label job requirements, candidate evidence, gaps, strengths, committee objections, and one recruiter action. The server computes score and routing from your labels. Use only supplied CV and job text; do not invent personal data.",
      user: JSON.stringify(body),
      schemaHint: {
        candidateName: "Candidate name or Candidate",
        candidateTitle: "Current or inferred title",
        jobItems: [
          {
            item: "Requirement from the target role",
            tier: "required",
            centrality: "core",
            status: "meets",
            obtainable: false,
            evidence: "Resume evidence or gap",
          },
        ],
        strengths: [
          {
            strength: "Candidate strength",
            centrality: "core",
            mapsToNeed: true,
            evidence: "Specific resume evidence",
          },
        ],
        committee: [
          { role: "recruiter", objection: "Legibility objection", score: 70 },
          { role: "hiring", objection: "Execution-risk objection", score: 64 },
          { role: "internal", objection: "Peer-bar objection", score: 58 },
        ],
        summary: "Short business-readable explanation",
        evidence: ["Specific evidence"],
        gaps: ["Missing or unclear requirement"],
        nextAction: "Send to hiring manager",
        quality: "Quality check passed",
      },
    });

    const output = result.output;
    const scoreReceipt = computeCvScore(output, body);
    const score = scoreReceipt.score;
    const candidateName = stringValue(output.candidateName, body.fileName || "Candidate");
    const candidateTitle = stringValue(output.candidateTitle, body.jobRole || "Candidate");
    const evidence = stringArray(output.evidence);
    const gaps = stringArray(output.gaps);
    const summary = stringValue(output.summary, "Candidate analysis completed.");
    const nextAction = routeCvAction(scoreReceipt, stringValue(output.nextAction, "Review with hiring manager"));
    const quality = stringValue(output.quality, "Quality check passed");
    const status = score >= 88 ? "Top match" : score >= 76 ? "Strong match" : "Review";
    const harnessPath = "harness/icm/workspaces/cv-match-dispatch";
    const supabase = getSupabaseAdmin();

    const { data: candidateRecord, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        name: candidateName,
        title: candidateTitle,
        source_file: body.fileName || "Pasted CV text",
        target_role: body.jobRole,
        score,
        confidence_label: confidenceLabel(score),
        summary,
        evidence,
        gaps,
        review_status: "Ready to review",
      })
      .select()
      .single();

    if (candidateError) throw new Error(candidateError.message);

    const runRecord = await insertRun({
      workflow: "CV Match",
      input: `${body.fileName || "Pasted CV text"} + ${body.jobRole || "target role"}`,
      result: `${confidenceLabel(score)}, ${score}%`,
      quality: scoreReceipt.confidence === "low" ? "Low-confidence check: evidence is thin" : quality,
      status: score >= 70 && scoreReceipt.confidence !== "low" ? "Ready to review" : "Needs review",
      evidence,
      dataUsed: [body.fileName || "Pasted CV text", body.jobRole || "Target role"],
      provider: result.provider,
      harnessPath,
      details: `${summary} Score receipt: base ${scoreReceipt.base}, gap mass ${scoreReceipt.gapMass.toFixed(2)}, strength mass ${scoreReceipt.strengthMass.toFixed(2)}, guards ${scoreReceipt.guards.join(", ") || "none"}.`,
      metadata: {
        model: result.model,
        scoreReceipt,
        committee: Array.isArray(output.committee) ? output.committee : [],
        source: "model labels, deterministic score",
      },
    });

    return jsonResponse({
      workflow: "CV Match",
      harnessPath,
      provider: result.provider,
      model: result.model,
      mode: result.mode,
      candidate: {
        id: candidateRecord.id,
        name: candidateRecord.name,
        title: candidateRecord.title ?? candidateTitle,
        source: candidateRecord.source_file ?? "Pasted CV text",
        score: candidateRecord.score ?? score,
        status,
        decision: nextAction,
        summary: candidateRecord.summary ?? summary,
        evidence,
        gaps,
        tags: stringArray(output.tags),
      },
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

function confidenceLabel(score: number) {
  if (score >= 90) return "Very strong fit";
  if (score >= 80) return "Strong fit";
  if (score >= 70) return "Worth reviewing";
  return "Needs more context";
}

type CvItem = {
  item: string;
  tier: "required" | "preferred";
  centrality: "core" | "supporting" | "peripheral";
  status: "meets" | "partial" | "missing";
  obtainable: boolean;
  evidence: string;
};

type CvStrength = {
  strength: string;
  centrality: "core" | "supporting" | "peripheral";
  mapsToNeed: boolean;
  evidence: string;
};

const TIER_WEIGHT = { required: 1, preferred: 0.35 };
const CENTRALITY_WEIGHT = { core: 1, supporting: 0.6, peripheral: 0.3 };
const STATUS_GAP = { meets: 0, partial: 0.5, missing: 1 };

function computeCvScore(output: Record<string, unknown>, body: Record<string, unknown>) {
  const items = normalizeCvItems(output.jobItems);
  const strengths = normalizeCvStrengths(output.strengths);
  const totalWeight = items.reduce((sum, item) => sum + itemWeight(item), 0);
  const gapMass = items.reduce((sum, item) => {
    const factor = item.obtainable && item.status === "missing" ? 0.5 : STATUS_GAP[item.status];
    return sum + itemWeight(item) * factor;
  }, 0);
  const normalizedGap = totalWeight > 0 ? gapMass / totalWeight : 0.5;
  const base = Math.round(100 * (1 - normalizedGap));
  const bestStrength = strengths
    .filter((strength) => strength.mapsToNeed)
    .map((strength) => CENTRALITY_WEIGHT[strength.centrality] * (strength.centrality === "core" ? 12 : strength.centrality === "supporting" ? 6 : 0))
    .sort((a, b) => b - a)[0] ?? 0;
  const edgeBonus = Math.round(bestStrength * (1 - base / 100));
  const guards: string[] = [];
  let score = Math.min(90, base + edgeBonus);
  const hardMissing = items.filter(
    (item) => item.tier === "required" && item.centrality !== "peripheral" && item.status === "missing" && !item.obtainable,
  ).length;

  if (hardMissing >= 2) {
    score = Math.min(score, 45);
    guards.push("required-gate cap");
  }

  const lowConfidence =
    items.length < 3 ||
    String(body.cvText ?? "").length < 200 ||
    String(body.jobDescription ?? body.jobRole ?? "").length < 120;

  if (lowConfidence) {
    score = clampNumber(score, 40, 65, 50);
    guards.push("confidence floor");
  }

  const strengthMass = strengths
    .filter((strength) => strength.mapsToNeed)
    .reduce((sum, strength) => sum + CENTRALITY_WEIGHT[strength.centrality], 0);

  return {
    score,
    base,
    edgeBonus,
    gapMass,
    totalWeight,
    strengthMass,
    hardMissing,
    confidence: lowConfidence ? "low" : "ok",
    guards,
    items,
    strengths,
  };
}

function normalizeCvItems(value: unknown): CvItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = typeof raw === "object" && raw ? raw as Record<string, unknown> : {};
    return {
      item: stringValue(item.item, `Requirement ${index + 1}`),
      tier: normalizeOne(item.tier, ["required", "preferred"], "preferred"),
      centrality: normalizeOne(item.centrality, ["core", "supporting", "peripheral"], "supporting"),
      status: normalizeOne(item.status, ["meets", "partial", "missing"], "partial"),
      obtainable: Boolean(item.obtainable),
      evidence: stringValue(item.evidence, "No evidence supplied"),
    };
  });
}

function normalizeCvStrengths(value: unknown): CvStrength[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const strength = typeof raw === "object" && raw ? raw as Record<string, unknown> : {};
    return {
      strength: stringValue(strength.strength, `Strength ${index + 1}`),
      centrality: normalizeOne(strength.centrality, ["core", "supporting", "peripheral"], "supporting"),
      mapsToNeed: Boolean(strength.mapsToNeed),
      evidence: stringValue(strength.evidence, "No evidence supplied"),
    };
  });
}

function itemWeight(item: CvItem) {
  return TIER_WEIGHT[item.tier] * CENTRALITY_WEIGHT[item.centrality];
}

function normalizeOne<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const normalized = String(value ?? "").toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function routeCvAction(scoreReceipt: ReturnType<typeof computeCvScore>, modelAction: string) {
  if (scoreReceipt.hardMissing >= 2) return "Do not dispatch; resolve hard missing requirements first.";
  if (scoreReceipt.confidence === "low") return "Ask for richer CV or role evidence before dispatch.";
  if (scoreReceipt.score >= 85) return modelAction;
  if (scoreReceipt.score >= 70) return "Shortlist with targeted follow-up questions.";
  return "Hold for recruiter review before dispatch.";
}
