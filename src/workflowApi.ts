import type { CandidateMatch, Deal, Prospect, RunLog } from "./data";
import { supabase } from "./supabaseClient";

type BackendRun = {
  id: string;
  workflow: RunLog["workflow"];
  input: string;
  result: string;
  quality: string;
  status: RunLog["status"];
  evidence: string[];
  dataUsed: string[];
  provider: string;
  details: string;
  started?: string;
};

type AnalyzeCvResponse = {
  candidate: CandidateMatch;
  run: BackendRun;
};

type AnalyzeCrmResponse = {
  deals: Deal[];
  pipeline: Array<{ stage: string; value: number; stalled: number }>;
  run: BackendRun;
};

type QualifyProspectsResponse = {
  prospects: Prospect[];
  run: BackendRun;
};

type WorkspaceResponse = {
  candidates: CandidateMatch[];
  deals: Deal[];
  prospects: Prospect[];
  runs: BackendRun[];
};

type CaptureProspectsResponse = {
  reviewStatus: string;
  readyCount: number;
  blockedCount: number;
  crmPayloads: Array<Record<string, unknown>>;
};

export type AnalyzeCvPayload = {
  cvText: string;
  fileName: string;
  jobRole: string;
  jobDescription: string;
};

export type AnalyzeCrmPayload = {
  csvText: string;
  fileName: string;
};

export type QualifyProspectsPayload = {
  icpText: string;
  sourceText: string;
  manualUrl: string;
  fileName: string;
};

export async function analyzeCvWithLlm(payload: AnalyzeCvPayload) {
  return invokeFunction<AnalyzeCvResponse>("analyze-cv", payload);
}

export async function analyzeCrmWithLlm(payload: AnalyzeCrmPayload) {
  return invokeFunction<AnalyzeCrmResponse>("analyze-crm", payload);
}

export async function qualifyProspectsWithLlm(payload: QualifyProspectsPayload) {
  return invokeFunction<QualifyProspectsResponse>("qualify-prospects", payload);
}

export async function loadWorkspaceData() {
  return invokeFunction<WorkspaceResponse>("list-workspace", {});
}

export async function captureProspects(prospects: Prospect[]) {
  return invokeFunction<CaptureProspectsResponse>("capture-prospects", { prospects });
}

export function normalizeRun(run: BackendRun): RunLog {
  return {
    id: run.id,
    workflow: run.workflow,
    started: run.started ?? "Just now",
    input: run.input,
    result: run.result,
    quality: run.quality,
    status: run.status,
    evidence: run.evidence,
    dataUsed: run.dataUsed,
    provider: run.provider,
    details: run.details,
  };
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) {
    throw new Error("The workspace is not connected yet. Ask the operator to finish deployment setup.");
  }

  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`${name} returned no data.`);
  }

  if ("error" in data && data.error) {
    throw new Error(data.error);
  }

  return data as T;
}
