import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RunInput = {
  workflow: "CV Match" | "CRM Analysis" | "Prospect Qualification";
  input: string;
  result: string;
  quality: string;
  status: "Analysis complete" | "Ready to review" | "Needs review" | "Issue found";
  evidence: string[];
  dataUsed: string[];
  provider: string;
  harnessPath: string;
  details: string;
  metadata?: Record<string, unknown>;
};

export function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey =
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured for Edge Functions.");
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function insertRun(input: RunInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runs")
    .insert({
      workflow: input.workflow,
      input_summary: input.input,
      result_summary: input.result,
      quality: input.quality,
      review_status: input.status,
      evidence: input.evidence,
      data_used: input.dataUsed,
      provider: input.provider,
      harness_path: input.harnessPath,
      metadata: {
        details: input.details,
        ...(input.metadata ?? {}),
      },
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function toRun(record: Record<string, unknown>) {
  return {
    id: String(record.id),
    workflow: record.workflow,
    started: "Just now",
    input: String(record.input_summary),
    result: String(record.result_summary),
    quality: String(record.quality),
    status: record.review_status,
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    dataUsed: Array.isArray(record.data_used) ? record.data_used : [],
    provider: String(record.provider),
    details:
      typeof record.metadata === "object" && record.metadata && "details" in record.metadata
        ? String((record.metadata as Record<string, unknown>).details)
        : String(record.result_summary),
  };
}
