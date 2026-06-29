# Stage 02: Score Match

## Input

Use the Stage 01 input packet, the scoring rubric, and the shared output schema.

## Process

1. Compare the CV against the job target.
2. Score each rubric area with supporting evidence.
3. List gaps or assumptions separately from strengths.
4. Produce a business-readable recommendation.

## Output

```json
{
  "score": 94,
  "confidenceLabel": "Very strong fit",
  "summary": "Strong frontend leadership and CRM migration evidence.",
  "evidence": ["Led React and Node migration for a CRM platform."],
  "gaps": ["No explicit Salesforce certification found."],
  "nextAction": "Send to hiring manager"
}
```

## Completion

Pass the recommendation to `03-validate-and-dispatch`.
