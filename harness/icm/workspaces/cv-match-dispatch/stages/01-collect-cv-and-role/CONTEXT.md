# Stage 01: Collect CV And Role

## Input

| Source | What | Required |
|---|---|---|
| User upload | CV file name and extracted text | Yes |
| User form | Target role or job description | Yes |
| User form | Must-have skills and recruiter notes | Optional |

## Process

1. Confirm that the user provided both candidate data and target role data.
2. Extract a short input summary.
3. Identify sensitive data that should not be copied into logs.
4. Build the input packet for Stage 02.

## Output

```json
{
  "candidateSource": "Elena_Lopez_CV.pdf",
  "targetRole": "Lead React Engineer",
  "mustHaveSkills": ["React", "Node.js", "CRM migration"],
  "redactionNotes": ["Do not log phone number"],
  "readyForScoring": true
}
```

## Completion

Proceed to `02-score-match` only when `readyForScoring` is true.
