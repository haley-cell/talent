# Stage 02: Diagnose Pipeline

## Input

Use the normalized CRM packet, pipeline rules, and analysis window.

## Process

1. Group deals by owner, stage, and risk condition.
2. Identify stalled deals and missing next steps.
3. Estimate revenue at risk from stale or incomplete deals.
4. Create a ranked list of issues.

## Output

```json
{
  "activePipeline": "EUR 312k",
  "dealsNeedingAction": 12,
  "revenueAtRisk": "EUR 74k",
  "issues": [
    {
      "company": "Northstar Talent",
      "risk": "High",
      "reason": "No activity for 21 days in negotiation"
    }
  ]
}
```

## Completion

Pass the ranked issues to `03-prioritize-actions`.
