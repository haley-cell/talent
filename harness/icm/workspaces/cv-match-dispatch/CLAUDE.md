# CV Match & Dispatch Workspace (L1)

Rank a candidate against a target role, explain the evidence, and prepare a recruiter-approved dispatch packet.

## What to Load

| Resource | When | Why |
|---|---|---|
| `CONTEXT.md` | Always | Workspace purpose and stage map |
| `stages/{current}/CONTEXT.md` | Always | Current stage contract |
| `references/scoring-rubric.md` | Stage 2 and Stage 3 | Fit score criteria |
| `../../shared/references/model-gateway.md` | Any model call | Provider-neutral model rules |
| `../../shared/references/quality-gates.md` | Stage 3 | Validate output before dispatch |
| `../../shared/references/privacy-and-data.md` | Always | CV data handling |
| `../../shared/references/output-schemas.md` | Stage 2 and Stage 3 | Structured output shape |

## What NOT to Load

| Resource | Why |
|---|---|
| CRM optimizer workspace | Irrelevant to candidate-role matching |
| Prospect workspace | Irrelevant unless a stage explicitly requests business development data |
| Full uploaded CV text in logs | Store source reference and evidence snippets only |
| Application source files | UI code is not needed for candidate scoring |

## Stage Progression

1. `01-collect-cv-and-role` - collect candidate and job target inputs.
2. `02-score-match` - score fit, extract evidence, identify gaps.
3. `03-validate-and-dispatch` - run quality checks and prepare dispatch packet.
