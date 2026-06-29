# Talent Ops Studio Root Router (L0)

Route each incoming job to exactly one workspace. Read this file first, then enter the selected workspace and read its `CLAUDE.md` load table.

## Routing Table

| Job Slug | Workspace | Entry Stage |
|---|---|---|
| `cv-match` | `workspaces/cv-match-dispatch/` | `01-collect-cv-and-role` |
| `cv-dispatch` | `workspaces/cv-match-dispatch/` | `03-validate-and-dispatch` |
| `crm-analyze` | `workspaces/crm-pipeline-optimizer/` | `01-import-and-map` |
| `crm-actions` | `workspaces/crm-pipeline-optimizer/` | `03-prioritize-actions` |
| `prospect-qualify` | `workspaces/prospect-qualification/` | `01-define-icp-and-sources` |
| `prospect-capture` | `workspaces/prospect-qualification/` | `03-capture-and-outreach` |

## What to Load

| Resource | When | Why |
|---|---|---|
| `CONTEXT.md` | Always | Shared policies and resource pointers |
| `label-registry.json` | Always | Stable labels used by UI, logs, and workflows |
| Selected workspace `CLAUDE.md` | After routing | Workspace load table and stage progression |

## What NOT to Load

| Resource | Why |
|---|---|
| Other workspaces | The current job should stay inside one workflow |
| Application source code | Load only if a stage explicitly asks for UI or runtime changes |
| All shared references | Load only the specific shared reference named by the workspace |
| Raw customer data | Use redacted samples unless the operator approved real data processing |

## Completion

After the selected stage finishes, write a structured run record with:

- workflow label
- input summary
- output summary
- evidence used
- quality check result
- recommended human review action
