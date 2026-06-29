# Stage 01: Define ICP And Sources

## Input

| Source | What | Required |
|---|---|---|
| User form | ICP description | Yes |
| User upload | Prospect CSV or company list | Optional |
| User form | Manual company or profile URL | Optional |
| User form | Exclusions and priority markets | Optional |

## Process

1. Convert the ICP into measurable criteria.
2. Normalize prospect records into a consistent shape.
3. Flag missing fields that block CRM capture.
4. Build the scoring packet for Stage 02.

## Output

```json
{
  "icpCriteria": ["B2B services", "active hiring", "uses HubSpot or Pipedrive"],
  "sourceCount": 31,
  "missingData": ["6 records missing email"],
  "readyForScoring": true
}
```

## Completion

Proceed to `02-score-and-enrich` when at least one prospect source is available.
