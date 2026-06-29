# Shared Output Schemas

These are compact schema contracts. Edge functions and UI mocks should keep the same field names.

## Run Record

```json
{
  "workflow": "CV Match",
  "inputSummary": "Candidate CV + target role",
  "resultSummary": "Very strong fit, 94%",
  "quality": "Quality check passed",
  "reviewStatus": "Ready to review",
  "evidence": ["Evidence item"],
  "dataUsed": ["Input source name"],
  "provider": "OpenRouter Auto"
}
```

## Recommendation

```json
{
  "score": 94,
  "confidenceLabel": "Very strong fit",
  "summary": "Business-readable explanation",
  "evidence": ["Specific reason"],
  "gaps": ["Risk or missing data"],
  "nextAction": "Human action to take"
}
```
