# Pipeline Rules

The CRM workflow is an operator, not a report generator. Every finding must produce either a field write or an owner next action.

| Condition | Label | Action |
|---|---|---|
| No activity for 14+ days in proposal or negotiation | High risk | Send owner a priority follow-up |
| No next step on qualified deal | Missing next step | Ask owner to define buyer action |
| High value and low probability | Coaching opportunity | Review qualification and blockers |
| Close date passed | Forecast issue | Update close date or close lost |

## Summary Metrics

- Active pipeline value.
- Deals needing action.
- Missing follow-up count.
- Win-rate trend when won/lost data exists.

## Required Output

Each priority action includes:

- company
- owner
- stage
- value
- risk
- recommended action
- `pipelineWrite.stage`
- `pipelineWrite.risk`
- `pipelineWrite.next_action`
- `pipelineWrite.review_status`
