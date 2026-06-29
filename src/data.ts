export type CandidateMatch = {
  id: string;
  name: string;
  title: string;
  source: string;
  score: number;
  status: string;
  decision: string;
  summary: string;
  evidence: string[];
  gaps: string[];
  tags: string[];
  roleMission?: {
    primaryMission?: string;
    businessOutcomes?: string[];
    successSignals?: string[];
  };
  candidateRead?: {
    trajectory?: string;
    strongestRelevantContext?: string;
    evidenceLimits?: string[];
  };
  fitArguments?: Array<{
    point: string;
    evidence: string;
  }>;
  followUpQuestions?: Array<{
    question: string;
    reason: string;
  }>;
};

export type Deal = {
  id: string;
  company: string;
  owner: string;
  stage: string;
  value: string;
  lastActivity: string;
  probability: number;
  risk: "High" | "Medium" | "Low";
  action: string;
  reason?: string;
  evidence?: string;
};

export type Prospect = {
  id: string;
  name: string;
  title: string;
  company: string;
  source: string;
  fit: number;
  status: string;
  reason: string;
  nextAction: string;
  email: string;
  evidence?: string[];
  missingData?: string[];
};

export type RunLog = {
  id: string;
  workflow: "CV Match" | "CRM Analysis" | "Prospect Qualification";
  started: string;
  input: string;
  result: string;
  quality: string;
  status: "Analysis complete" | "Ready to review" | "Needs review" | "Issue found";
  evidence: string[];
  dataUsed: string[];
  provider: string;
  details: string;
};
