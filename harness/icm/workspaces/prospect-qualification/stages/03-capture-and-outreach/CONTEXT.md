# Stage 03: Capture And Outreach

## Input

Use scored prospects, privacy rules, quality gates, and CRM field requirements.

## Process

1. Build a CRM payload for each approved prospect.
2. Draft a short outreach angle using only approved evidence.
3. Block capture if required CRM fields are missing.
4. Prepare a review summary for the operator.

## Output

```json
{
  "crmPayloads": [
    {
      "company": "ScaleWorks",
      "contact": "Camille Roux",
      "status": "Ready to capture",
      "source": "LinkedIn CSV",
      "outreachAngle": "Offer a quick audit of candidate screening workflow"
    }
  ],
  "blockedRecords": []
}
```

## Completion

Write a run record and show capture-ready prospects in the Prospect Tool.
