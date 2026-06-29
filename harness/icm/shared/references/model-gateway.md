# Model Gateway Reference

Use an OpenAI-compatible chat completion interface so the harness can switch between OpenRouter, Groq, OpenCode-compatible endpoints, or a custom gateway.

## Required Inputs

| Field | Required | Notes |
|---|---|---|
| `baseUrl` | Yes | Provider API root ending in `/v1` |
| `apiKey` | Yes in production | Empty only for local gateways that do not require auth |
| `model` | Yes | Provider-specific model identifier |
| `messages` | Yes | System, user, and optional developer instructions |
| `responseSchema` | Yes | JSON object shape expected from the workflow |

## Provider Rules

- Never hard-code model names inside stage contracts.
- The provider may change, but the output schema must not.
- Prefer deterministic settings for scoring workflows.
- If the provider cannot guarantee structured output, run a repair and validation pass.

## UI Language

Expose provider choice as "AI provider" or "Model gateway". Avoid technical-only labels such as raw endpoint, token count, or response timing in the main operator flow.
