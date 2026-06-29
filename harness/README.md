# Talent Ops Studio Harness

This folder documents the agent harness behind Talent Ops Studio. It is designed as an Interpreted Context Methodology workspace: small routers, explicit stage contracts, and structured outputs that can be inspected during an interview.

## Why It Exists

The dashboard is the operator interface. The harness is the operating method:

- Keep each AI workflow narrow and auditable.
- Declare exactly what context each stage may load.
- Produce structured outputs that can be validated before any CRM or recruiting action.
- Stay model agnostic by using OpenAI-compatible chat completion providers.

## Folder Map

```txt
harness/icm/
├── CLAUDE.md                  # L0 root router
├── CONTEXT.md                 # Shared context and resource pointers
├── label-registry.json        # Stable workflow labels
├── shared/references/         # Cross-workflow policies and schemas
└── workspaces/                # One ICM workspace per business workflow
```

Each workspace contains:

```txt
workspace/
├── CLAUDE.md                  # L1 workspace router and load table
├── CONTEXT.md                 # Workspace purpose and stage map
├── references/                # Workflow-specific scoring rules
└── stages/
    ├── 01-.../CONTEXT.md      # L2 stage contract
    ├── 02-.../CONTEXT.md
    └── 03-.../CONTEXT.md
```

## Dashboard Mapping

| Dashboard Screen | ICM Workspace | Business Outcome |
|---|---|---|
| CV Match & Dispatch | `workspaces/cv-match-dispatch/` | Rank candidate fit and prepare dispatch evidence |
| CRM Pipeline Optimizer | `workspaces/crm-pipeline-optimizer/` | Find stalled revenue and next-best actions |
| Prospect Qualifier | `workspaces/prospect-qualification/` | Score leads, draft outreach, and prepare CRM capture |
| Activity Logs | `runs/` plus Supabase `runs` table | Show traceability, data used, and review status |

## Provider Contract

All model calls must use the same generic request shape:

```json
{
  "provider": "openrouter|groq|opencode|custom",
  "baseUrl": "https://provider.example.com/v1",
  "model": "model-name",
  "messages": [],
  "responseSchema": {}
}
```

No workflow should depend on provider-only features unless it first defines a fallback.
