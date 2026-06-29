# CV Match Scoring Rubric

The model labels evidence; the harness computes the score. Do not ask an LLM to invent a final fit percentage directly.

## Label Contract

Each job item is labeled with:

| Field | Values | Rule |
|---|---|---|
| `tier` | `required`, `preferred` | Read from the job target. Ambiguous means preferred. |
| `centrality` | `core`, `supporting`, `peripheral` | How close the item is to the role's primary job. |
| `status` | `meets`, `partial`, `missing` | Read from CV evidence only. Keyword overlap is not enough. |
| `obtainable` | boolean | True only if the job says the requirement can be learned or obtained. |

## Deterministic Score

| Factor | Weight |
|---|---:|
| Required item | 1.00 |
| Preferred item | 0.35 |
| Core centrality | 1.00 |
| Supporting centrality | 0.60 |
| Peripheral centrality | 0.30 |
| Missing gap | 1.00 |
| Partial gap | 0.50 |
| Meets gap | 0.00 |

Score pipeline:

1. `item_weight = tier_weight * centrality_weight`.
2. `gap_mass = sum(item_weight * gap_factor)`.
3. `base = 100 * (1 - gap_mass / total_weight)`.
4. Add a small edge bonus for the strongest mapped strength.
5. Cap at 90 to avoid false certainty.
6. Cap at 45 when two or more hard required core/supporting items are missing.
7. Clamp to 40-65 when CV or role evidence is thin.

## Score Labels

| Score | Label | Suggested Action |
|---:|---|---|
| 90-100 | Very strong fit | Send to hiring manager |
| 80-89 | Strong fit | Shortlist for screening |
| 70-79 | Worth reviewing | Ask targeted follow-up questions |
| Below 70 | Needs more context | Do not dispatch without review |

Every run stores a score receipt with base score, gap mass, strength mass, guards fired, and labeled items.
