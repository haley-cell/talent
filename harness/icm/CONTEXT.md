# Talent Ops Studio Shared Context

Talent Ops Studio helps a small recruiting or business development team use AI for CV analysis, CRM analysis, and prospect qualification.

## Shared References

| File | Use |
|---|---|
| `shared/references/model-gateway.md` | Provider-neutral model call rules |
| `shared/references/quality-gates.md` | Validation checks before displaying or exporting results |
| `shared/references/privacy-and-data.md` | Handling CV, CRM, and prospect data safely |
| `shared/references/output-schemas.md` | JSON output contracts shared across workflows |

## Operator Principles

- Show the user where to provide input before showing analytics.
- Explain recommendations in business language.
- Surface evidence, gaps, and next action.
- Require review before dispatching a candidate, updating CRM, or capturing a prospect.

## Data Sources

| Source | Examples | Allowed Use |
|---|---|---|
| CV upload or pasted resume | PDF, DOCX text, paste field | Candidate-role comparison |
| Job target | Role brief, job description, must-have skills | Match scoring and gap analysis |
| CRM export | HubSpot, Pipedrive, Salesforce CSV | Pipeline health and next-best actions |
| Prospect source | CSV, company list, manual profile URL | ICP fit scoring and outreach preparation |
