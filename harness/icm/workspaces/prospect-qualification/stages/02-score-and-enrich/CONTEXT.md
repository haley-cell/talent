# Stage 02: Score And Enrich

## Input

Use the ICP criteria, normalized prospect records, and ICP rubric.

## Process

1. Score each prospect against the rubric.
2. Explain the fit in one business-readable sentence.
3. Separate confirmed evidence from assumptions.
4. Mark records that need review before capture.

## Output

```json
{
  "prospects": [
    {
      "name": "Camille Roux",
      "company": "ScaleWorks",
      "fit": 92,
      "status": "Capture now",
      "reason": "Hiring 20+ tech roles and uses HubSpot",
      "missingData": []
    }
  ],
  "quality": "Quality check passed"
}
```

## Completion

Pass high-fit prospects to `03-capture-and-outreach`.
