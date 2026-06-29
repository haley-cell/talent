# Stage 03: Validate And Dispatch

## Input

Use the Stage 02 recommendation, source summary, quality gates, and privacy rules.

## Process

1. Check that the recommendation matches the shared schema.
2. Verify that every score has evidence.
3. Redact unnecessary personal data.
4. Prepare a recruiter-facing dispatch note.
5. Mark the result as approved, ready to review, or needs review.

## Output

```json
{
  "dispatchNote": "Elena is a very strong fit for the Lead React Engineer role...",
  "quality": "Quality check passed",
  "reviewStatus": "Ready to review",
  "blockedReasons": []
}
```

## Completion

Write a run record and show the dispatch note in the CV Tool.
