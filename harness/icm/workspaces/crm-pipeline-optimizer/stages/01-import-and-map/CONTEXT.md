# Stage 01: Import And Map

## Input

| Source | What | Required |
|---|---|---|
| User upload | CRM CSV file name and rows | Yes |
| User form | Field mapping | Yes |
| User form | Date range or segment filter | Optional |

## Process

1. Validate that required columns can be mapped.
2. Normalize dates, stage names, values, and owners.
3. Flag missing or inconsistent values.
4. Build the normalized CRM packet for Stage 02.

## Output

```json
{
  "source": "pipedrive_export.csv",
  "rowCount": 124,
  "mappedFields": ["company", "owner", "stage", "value", "lastActivity", "nextStep"],
  "dataWarnings": ["7 rows missing nextStep"],
  "readyForAnalysis": true
}
```

## Completion

Proceed to `02-diagnose-pipeline` only when `readyForAnalysis` is true.
