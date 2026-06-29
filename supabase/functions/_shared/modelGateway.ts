export type ModelGatewayRequest = {
  system: string;
  user: string;
  schemaHint: Record<string, unknown>;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export async function callModelGateway(request: ModelGatewayRequest) {
  const baseUrl = Deno.env.get("MODEL_BASE_URL") ?? "https://openrouter.ai/api/v1";
  const apiKey = Deno.env.get("MODEL_API_KEY");
  const model = Deno.env.get("MODEL_NAME") ?? "openrouter/auto";
  const provider = Deno.env.get("MODEL_PROVIDER_LABEL") ?? "OpenAI-compatible gateway";

  if (!apiKey) {
    throw new Error("MODEL_API_KEY is not configured on the server.");
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: request.system },
        {
          role: "user",
          content: `${request.user}\n\nReturn JSON matching this shape:\n${JSON.stringify(
            request.schemaHint,
          )}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Model gateway returned ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const output = parseJsonContent(content);

  return { provider, model, mode: "live", output };
}

function parseJsonContent(content: unknown): Record<string, unknown> {
  if (typeof content !== "string") {
    throw new Error("Model gateway returned an empty response.");
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("Model gateway did not return valid JSON.");
  }
}
