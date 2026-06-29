# Quality Gates

Every workflow output must pass these checks before it appears as a confident recommendation.

## Universal Checks

| Check | Pass Condition | If It Fails |
|---|---|---|
| Schema | Required fields are present and typed | Mark as "Needs review" |
| Evidence | Every score has at least one supporting reason | Lower confidence |
| Data source | Output names the input files or records used | Block export |
| Sensitive data | No unnecessary personal data in outreach or logs | Redact and rerun |
| Actionability | Output includes a clear next step | Ask for more context |

## User-Facing Labels

| Internal Condition | Display Label |
|---|---|
| `schema_passed` | Quality check passed |
| `missing_evidence` | Evidence needs review |
| `low_confidence` | Needs human review |
| `export_blocked` | Review required before export |

## Completion

Quality results are stored with each run and shown in Activity Logs.
