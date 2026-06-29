# CRM Pipeline Optimizer Workspace (L1)

Analyze CRM exports, detect pipeline risk, and recommend business development actions.

## What to Load

| Resource | When | Why |
|---|---|---|
| `CONTEXT.md` | Always | Workspace purpose and stage map |
| `stages/{current}/CONTEXT.md` | Always | Current stage contract |
| `references/pipeline-rules.md` | Stage 2 and Stage 3 | Risk and action criteria |
| `../../shared/references/model-gateway.md` | Any model call | Provider-neutral model rules |
| `../../shared/references/quality-gates.md` | Stage 3 | Validate output before recommendations |
| `../../shared/references/privacy-and-data.md` | Always | CRM data handling |
| `../../shared/references/output-schemas.md` | Stage 2 and Stage 3 | Structured output shape |

## What NOT to Load

| Resource | Why |
|---|---|
| Full CRM export | Load only the normalized rows required for the current analysis |
| CV workspace | Recruiting CV context is unrelated to CRM pipeline health |
| Prospect workspace | Lead scoring logic is not needed for existing CRM deals |
| Application source files | UI code is not needed for analysis |

## Stage Progression

1. `01-import-and-map` - normalize CSV columns and date fields.
2. `02-diagnose-pipeline` - identify stale deals, missing next steps, and risk.
3. `03-prioritize-actions` - produce owner-level actions and follow-up copy.
