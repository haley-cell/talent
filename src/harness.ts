export type WorkflowKey = "cv" | "crm" | "prospects";

export type ProviderPreset = {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  note: string;
};

export type IcmStage = {
  id: string;
  label: string;
  path: string;
  operatorLabel: string;
};

export type IcmWorkflow = {
  id: WorkflowKey;
  label: string;
  workspacePath: string;
  routerPath: string;
  outcome: string;
  stages: IcmStage[];
};

export const providerPresets: ProviderPreset[] = [
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    note: "Useful for low-cost, high-speed production workflows.",
  },
  {
    id: "openrouter",
    label: "OpenRouter Auto",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/auto",
    note: "Fast model switching without changing the app.",
  },
  {
    id: "opencode",
    label: "OpenCode compatible",
    baseUrl: "http://127.0.0.1:4096/v1",
    model: "opencode-managed-model",
    note: "Points to any local OpenAI-compatible agent gateway.",
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible",
    baseUrl: "https://your-gateway.example.com/v1",
    model: "your-model",
    note: "Use any provider that exposes chat completions.",
  },
];

export const icmWorkflows: IcmWorkflow[] = [
  {
    id: "cv",
    label: "CV Match & Dispatch",
    workspacePath: "harness/icm/workspaces/cv-match-dispatch",
    routerPath: "harness/icm/workspaces/cv-match-dispatch/CLAUDE.md",
    outcome: "Evidence-backed candidate recommendation",
    stages: [
      {
        id: "01",
        label: "Collect CV and role",
        path: "stages/01-collect-cv-and-role/CONTEXT.md",
        operatorLabel: "Upload candidate data and define the job target",
      },
      {
        id: "02",
        label: "Score match",
        path: "stages/02-score-match/CONTEXT.md",
        operatorLabel: "Compare evidence against the role",
      },
      {
        id: "03",
        label: "Validate and dispatch",
        path: "stages/03-validate-and-dispatch/CONTEXT.md",
        operatorLabel: "Review quality checks before sharing",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM Pipeline Optimizer",
    workspacePath: "harness/icm/workspaces/crm-pipeline-optimizer",
    routerPath: "harness/icm/workspaces/crm-pipeline-optimizer/CLAUDE.md",
    outcome: "Prioritized revenue actions",
    stages: [
      {
        id: "01",
        label: "Import and map",
        path: "stages/01-import-and-map/CONTEXT.md",
        operatorLabel: "Import CRM export and confirm fields",
      },
      {
        id: "02",
        label: "Diagnose pipeline",
        path: "stages/02-diagnose-pipeline/CONTEXT.md",
        operatorLabel: "Find stalled deals and missing follow-ups",
      },
      {
        id: "03",
        label: "Prioritize actions",
        path: "stages/03-prioritize-actions/CONTEXT.md",
        operatorLabel: "Prepare owner-level next steps",
      },
    ],
  },
  {
    id: "prospects",
    label: "Prospect Qualification",
    workspacePath: "harness/icm/workspaces/prospect-qualification",
    routerPath: "harness/icm/workspaces/prospect-qualification/CLAUDE.md",
    outcome: "Capture-ready prospect list",
    stages: [
      {
        id: "01",
        label: "Define ICP and sources",
        path: "stages/01-define-icp-and-sources/CONTEXT.md",
        operatorLabel: "Describe the ICP and import lead sources",
      },
      {
        id: "02",
        label: "Score and enrich",
        path: "stages/02-score-and-enrich/CONTEXT.md",
        operatorLabel: "Score fit and flag missing data",
      },
      {
        id: "03",
        label: "Capture and outreach",
        path: "stages/03-capture-and-outreach/CONTEXT.md",
        operatorLabel: "Prepare CRM payloads and outreach angles",
      },
    ],
  },
];

export function confidenceLabel(score: number) {
  if (score >= 90) return "Very strong fit";
  if (score >= 80) return "Strong fit";
  if (score >= 70) return "Worth reviewing";
  return "Needs more context";
}

export function qualityTone(quality: string) {
  if (quality.toLowerCase().includes("missing")) return "warning";
  if (quality.toLowerCase().includes("issue")) return "danger";
  return "success";
}

export function describeGateway(provider: ProviderPreset) {
  return `${provider.label} (${provider.model})`;
}
