import { corsHeaders, jsonResponse } from "../_shared/modelGateway.ts";
import { getSupabaseAdmin } from "../_shared/db.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const prospects = Array.isArray(body.prospects) ? body.prospects : [];
    const ready = prospects.filter((prospect) => prospect.status === "Capture now");
    const supabase = getSupabaseAdmin();
    const crmPayloads = ready.map((prospect) => ({
      company: prospect.company,
      contact: prospect.name,
      source: prospect.source ?? "Prospect Tool",
      status: "Ready to capture",
    }));

    if (crmPayloads.length > 0) {
      const { error } = await supabase.from("approvals").insert(
        crmPayloads.map((payload) => ({
          action: "Capture prospect to CRM",
          notes: JSON.stringify(payload),
        })),
      );

      if (error) throw new Error(error.message);
    }

    return jsonResponse({
      workflow: "Prospect Qualification",
      harnessPath: "harness/icm/workspaces/prospect-qualification",
      reviewStatus: ready.length === prospects.length ? "Ready to capture" : "Needs review",
      readyCount: ready.length,
      blockedCount: prospects.length - ready.length,
      crmPayloads,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
