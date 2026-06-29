# ICP Fit Rubric

The model labels prospect evidence; the harness computes the fit score and route.

## Hard Gate

Run before scoring. A prospect stays in review if any gate is true:

- Excluded or unethical industry.
- No reachable company or contact path.
- Clearly outside the supplied ICP.
- The source does not support the claimed company/contact.

| Area | Weight | Evidence Required |
|---|---:|---|
| Market fit | 25 | Industry, company type, or segment matches target |
| Buying signal | 25 | Hiring, growth, CRM pain, automation project, or public post |
| Role authority | 20 | Contact can influence recruiting, sales, RevOps, or operations |
| Timing | 15 | Recent trigger or active business need |
| Data completeness | 15 | Email, company, title, source, and reason are known |

Each area is labeled 0-10. The final score is the weighted sum, not a freeform LLM rating.

## Status Labels

| Score | Label | Action |
|---:|---|---|
| 85-100 | Capture now | Add to CRM after review |
| 70-84 | Review | Verify missing data |
| Below 70 | Nurture | Save for later sequence |

Every run stores the dimension scores, weights, gate reason, and pipeline write payload.
