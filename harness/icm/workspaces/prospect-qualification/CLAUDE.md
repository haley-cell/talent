# Prospect Qualification Workspace (L1)

Score target accounts or contacts against an ideal customer profile, prepare outreach, and capture approved prospects to CRM.

## What to Load

| Resource | When | Why |
|---|---|---|
| `CONTEXT.md` | Always | Workspace purpose and stage map |
| `stages/{current}/CONTEXT.md` | Always | Current stage contract |
| `references/icp-rubric.md` | Stage 1 and Stage 2 | Fit scoring criteria |
| `../../shared/references/model-gateway.md` | Any model call | Provider-neutral model rules |
| `../../shared/references/quality-gates.md` | Stage 2 and Stage 3 | Validate scoring and capture |
| `../../shared/references/privacy-and-data.md` | Always | Prospect data handling |
| `../../shared/references/output-schemas.md` | Stage 2 and Stage 3 | Structured output shape |

## What NOT to Load

| Resource | Why |
|---|---|
| CRM optimizer workspace | Existing deal analysis is separate from lead qualification |
| CV workspace | Candidate matching is unrelated to prospect fit |
| Raw personal contact data in logs | Store summaries and CRM record IDs instead |
| Application source files | UI code is not needed for qualification |

## Stage Progression

1. `01-define-icp-and-sources` - define ideal customer profile and import source records.
2. `02-score-and-enrich` - score fit and prepare evidence.
3. `03-capture-and-outreach` - prepare CRM payload and outreach draft.
