# Stage 03: Prioritize Actions

## Input

Use Stage 02 issues, pipeline rules, quality gates, and privacy rules.

## Process

1. Sort recommendations by value, risk, and actionability.
2. Write a concise next-best action for each priority deal.
3. Add owner-level coaching notes when patterns repeat.
4. Validate output schema and data source references.

## Output

```json
{
  "priorityActions": [
    {
      "company": "Northstar Talent",
      "owner": "A. Martin",
      "action": "Send decision-maker recap and book next step",
      "reviewStatus": "Ready to review"
    }
  ],
  "quality": "Quality check passed"
}
```

## Completion

Write a run record and show actions in the CRM Analyzer.
