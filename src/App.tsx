import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  History,
  Layers3,
  Mail,
  PlayCircle,
  Send,
  ShieldCheck,
  Target,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type CandidateMatch,
  type Deal,
  type Prospect,
  type RunLog,
} from "./data";
import {
  analyzeCrmWithLlm,
  analyzeCvWithLlm,
  captureProspects,
  loadWorkspaceData,
  normalizeRun,
  qualifyProspectsWithLlm,
} from "./workflowApi";
import {
  confidenceLabel,
  qualityTone,
} from "./harness";
import { hasSupabaseConfig } from "./supabaseClient";

type View = "command" | "cv" | "crm" | "prospects" | "logs";
type Tone = "default" | "success" | "warning" | "danger" | "info" | "strong";
type RunningWorkflow = "cv" | "crm" | "prospects" | null;

const navItems: Array<{
  id: View;
  label: string;
  icon: typeof BarChart3;
  group?: "operations";
}> = [
  { id: "command", label: "Operations Desk", icon: BarChart3 },
  { id: "cv", label: "Candidate Review", icon: FileText },
  { id: "crm", label: "CRM Actions", icon: Users },
  { id: "prospects", label: "Lead Capture", icon: Target },
  { id: "logs", label: "Reviews", icon: History, group: "operations" },
];

const chartColors = {
  primary: "#255f4d",
  secondary: "#a7b0a8",
  grid: "#d8ddd6",
  cursor: "#eef2ec",
};

const storageKeys = {
  candidates: "talent-ops:production:candidates",
  deals: "talent-ops:production:deals",
  prospects: "talent-ops:production:prospects",
  logs: "talent-ops:production:logs",
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache workspace results for refreshes.
  }
}

function cleanNotice(message: string) {
  if (/supabase|service_role|vite_|deployment|environment|backend|permission denied/i.test(message)) {
    return "This run could not be completed. Try again after the workspace connection is checked.";
  }
  if (/model_api_key|api key|groq|openrouter/i.test(message)) {
    return "The analysis engine needs attention. Try again after the connection is checked.";
  }
  return message;
}

function App() {
  const [activeView, setActiveView] = useState<View>("command");
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>(() =>
    readStored(storageKeys.candidates, []),
  );
  const [crmDeals, setCrmDeals] = useState<Deal[]>(() => readStored(storageKeys.deals, []));
  const [qualifiedProspects, setQualifiedProspects] = useState<Prospect[]>(() =>
    readStored(storageKeys.prospects, []),
  );
  const [logs, setLogs] = useState<RunLog[]>(() => readStored(storageKeys.logs, []));
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [runningWorkflow, setRunningWorkflow] = useState<RunningWorkflow>(null);
  const [cvFileName, setCvFileName] = useState("");
  const [cvText, setCvText] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [crmFileName, setCrmFileName] = useState("");
  const [crmCsvText, setCrmCsvText] = useState("");
  const [prospectFileName, setProspectFileName] = useState("");
  const [icpText, setIcpText] = useState("");
  const [prospectSourceText, setProspectSourceText] = useState("");
  const [manualProspectUrl, setManualProspectUrl] = useState("");

  const selectedCandidate = useMemo(
    () =>
      candidateMatches.find((candidate) => candidate.id === selectedCandidateId) ??
      candidateMatches[0] ??
      null,
    [candidateMatches, selectedCandidateId],
  );

  const selectedDeal = useMemo(
    () => crmDeals.find((deal) => deal.id === selectedDealId) ?? crmDeals[0] ?? null,
    [crmDeals, selectedDealId],
  );

  const selectedProspect = useMemo(
    () =>
      qualifiedProspects.find((prospect) => prospect.id === selectedProspectId) ??
      qualifiedProspects[0] ??
      null,
    [qualifiedProspects, selectedProspectId],
  );

  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedLogId) ?? logs[0] ?? null,
    [logs, selectedLogId],
  );

  const pipeline = useMemo(
    () => buildPipelineFromDeals(crmDeals),
    [crmDeals],
  );

  const commandMetrics = useMemo(
    () => ({
      cvReady: candidateMatches.length,
      dealsNeedingAction: crmDeals.filter((deal) => deal.risk !== "Low").length,
      prospectsToReview: qualifiedProspects.length,
      prospectsReady: qualifiedProspects.filter((prospect) => prospect.status === "Capture now").length,
    }),
    [candidateMatches, crmDeals, qualifiedProspects],
  );

  useEffect(() => writeStored(storageKeys.candidates, candidateMatches), [candidateMatches]);
  useEffect(() => writeStored(storageKeys.deals, crmDeals), [crmDeals]);
  useEffect(() => writeStored(storageKeys.prospects, qualifiedProspects), [qualifiedProspects]);
  useEffect(() => writeStored(storageKeys.logs, logs), [logs]);

  useEffect(() => {
    let cancelled = false;

    if (!hasSupabaseConfig) {
      return;
    }

    loadWorkspaceData()
      .then((workspace) => {
        if (cancelled) return;
        setCandidateMatches(workspace.candidates);
        setCrmDeals(workspace.deals);
        setQualifiedProspects(workspace.prospects);
        setLogs(workspace.runs.map(normalizeRun));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice(error instanceof Error ? cleanNotice(error.message) : "Could not load the workspace.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addLog(run: RunLog) {
    setLogs((current) => [run, ...current]);
    setSelectedLogId(run.id);
    setNotice(`${run.workflow} finished. ${run.result}.`);
  }

  async function runCvAnalysis() {
    if (runningWorkflow) return;
    if (!cvText.trim() && !cvFileName) {
      setActiveView("cv");
      setNotice("Add a CV file or paste CV text before running the match.");
      return;
    }
    if (!jobRole.trim() || !jobDescription.trim()) {
      setActiveView("cv");
      setNotice("Add the target role and job description before running the match.");
      return;
    }
    setRunningWorkflow("cv");
    setNotice("Analyzing candidate match...");
    try {
      const result = await analyzeCvWithLlm({
        cvText,
        fileName: cvFileName,
        jobRole,
        jobDescription,
      });
      setCandidateMatches((current) => [result.candidate, ...current]);
      setSelectedCandidateId(result.candidate.id);
      addLog(normalizeRun(result.run));
      setActiveView("logs");
    } catch (error) {
      setNotice(error instanceof Error ? cleanNotice(error.message) : "CV analysis failed.");
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function runCrmAnalysis() {
    if (runningWorkflow) return;
    if (!crmCsvText.trim()) {
      setActiveView("crm");
      setNotice("Upload or paste a CRM CSV before running pipeline analysis.");
      return;
    }
    setRunningWorkflow("crm");
    setNotice("Checking CRM follow-ups...");
    try {
      const result = await analyzeCrmWithLlm({
        csvText: crmCsvText,
        fileName: crmFileName,
      });
      setCrmDeals(result.deals);
      setSelectedDealId(result.deals[0]?.id ?? null);
      addLog(normalizeRun(result.run));
      setActiveView("logs");
    } catch (error) {
      setNotice(error instanceof Error ? cleanNotice(error.message) : "CRM analysis failed.");
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function runProspectQualification() {
    if (runningWorkflow) return;
    if (!icpText.trim()) {
      setActiveView("prospects");
      setNotice("Define the ICP before scoring prospects.");
      return;
    }
    if (!prospectSourceText.trim() && !manualProspectUrl.trim()) {
      setActiveView("prospects");
      setNotice("Add a prospect source, company list, or profile URL before scoring.");
      return;
    }
    setRunningWorkflow("prospects");
    setNotice("Scoring prospect fit...");
    try {
      const result = await qualifyProspectsWithLlm({
        icpText,
        sourceText: prospectSourceText,
        manualUrl: manualProspectUrl,
        fileName: prospectFileName,
      });
      setQualifiedProspects(result.prospects);
      setSelectedProspectId(result.prospects[0]?.id ?? null);
      addLog(normalizeRun(result.run));
      setActiveView("logs");
    } catch (error) {
      setNotice(error instanceof Error ? cleanNotice(error.message) : "Prospect qualification failed.");
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function captureSelectedProspect(prospect: Prospect) {
    try {
      const result = await captureProspects([prospect]);
      setNotice(
        `${prospect.name} capture processed. ${result.readyCount} ready, ${result.blockedCount} blocked.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? cleanNotice(error.message) : "Prospect capture failed.");
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main-panel">
        <TopBar
          activeView={activeView}
          notice={notice}
        />
        <section id="main-content" className="page-scroll" aria-live="polite" tabIndex={-1}>
          {activeView === "command" && (
            <CommandCenter
              setActiveView={setActiveView}
              logs={logs}
              candidates={candidateMatches}
              deals={crmDeals}
              prospects={qualifiedProspects}
              metrics={commandMetrics}
            />
          )}
          {activeView === "cv" && (
            <CvTool
              candidates={candidateMatches}
              selectedCandidate={selectedCandidate}
              setSelectedCandidateId={setSelectedCandidateId}
              cvFileName={cvFileName}
              cvText={cvText}
              setCvText={setCvText}
              jobRole={jobRole}
              setJobRole={setJobRole}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              onCvFile={async (file) => {
                const text = await readTextFile(file);
                setCvFileName(file.name);
                setCvText(text);
              }}
              runCvAnalysis={runCvAnalysis}
              isRunning={runningWorkflow === "cv"}
              onAction={setNotice}
            />
          )}
          {activeView === "crm" && (
            <CrmAnalyzer
              deals={crmDeals}
              pipeline={pipeline}
              selectedDeal={selectedDeal}
              setSelectedDealId={setSelectedDealId}
              crmFileName={crmFileName}
              crmCsvText={crmCsvText}
              setCrmCsvText={setCrmCsvText}
              onCrmFile={async (file) => {
                const text = await readTextFile(file);
                setCrmFileName(file.name);
                setCrmCsvText(text);
              }}
              runCrmAnalysis={runCrmAnalysis}
              isRunning={runningWorkflow === "crm"}
              onAction={setNotice}
            />
          )}
          {activeView === "prospects" && (
            <ProspectTool
              prospects={qualifiedProspects}
              selectedProspect={selectedProspect}
              setSelectedProspectId={setSelectedProspectId}
              prospectFileName={prospectFileName}
              icpText={icpText}
              setIcpText={setIcpText}
              prospectSourceText={prospectSourceText}
              setProspectSourceText={setProspectSourceText}
              manualProspectUrl={manualProspectUrl}
              setManualProspectUrl={setManualProspectUrl}
              onProspectFile={async (file) => {
                const text = await readTextFile(file);
                setProspectFileName(file.name);
                setProspectSourceText(text);
              }}
              onCaptureProspect={captureSelectedProspect}
              runProspectQualification={runProspectQualification}
              isRunning={runningWorkflow === "prospects"}
              onAction={setNotice}
            />
          )}
          {activeView === "logs" && (
            <ActivityLogs
              logs={logs}
              selectedLog={selectedLog}
              setSelectedLogId={setSelectedLogId}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Sidebar({
  activeView,
  setActiveView,
}: {
  activeView: View;
  setActiveView: (view: View) => void;
}) {
  return (
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => setActiveView("command")}>
        <span className="brand-mark">
          <Layers3 size={20} aria-hidden="true" />
        </span>
        <span>
          <span className="brand-title">Talent Ops</span>
          <span className="brand-subtitle">Studio</span>
        </span>
      </button>

      <nav className="nav-list" aria-label="Main navigation">
        <span className="nav-kicker">Workflows</span>
        {navItems
          .filter((item) => !item.group)
          .map((item) => (
            <NavButton key={item.id} item={item} activeView={activeView} onClick={setActiveView} />
          ))}
        <span className="nav-kicker nav-kicker-spaced">Operations</span>
        {navItems
          .filter((item) => item.group)
          .map((item) => (
            <NavButton key={item.id} item={item} activeView={activeView} onClick={setActiveView} />
          ))}
      </nav>
    </aside>
  );
}

function NavButton({
  item,
  activeView,
  onClick,
}: {
  item: (typeof navItems)[number];
  activeView: View;
  onClick: (view: View) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      className={`nav-item ${activeView === item.id ? "nav-item-active" : ""}`}
      type="button"
      onClick={() => onClick(item.id)}
      aria-current={activeView === item.id ? "page" : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function TopBar({
  activeView,
  notice,
}: {
  activeView: View;
  notice: string;
}) {
  const titles: Record<View, string> = {
    command: "Operations Desk",
    cv: "CV Match & Dispatch",
    crm: "CRM Pipeline Optimizer",
    prospects: "Prospect Qualification",
    logs: "Reviews",
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Recruiting and growth operations</p>
        <h1>{titles[activeView]}</h1>
      </div>
      {notice ? (
        <div className="topbar-actions">
          <div className="operator-card" title={notice} role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function CommandCenter({
  setActiveView,
  logs,
  candidates,
  deals,
  prospects,
  metrics,
}: {
  setActiveView: (view: View) => void;
  logs: RunLog[];
  candidates: CandidateMatch[];
  deals: Deal[];
  prospects: Prospect[];
  metrics: {
    cvReady: number;
    dealsNeedingAction: number;
    prospectsToReview: number;
    prospectsReady: number;
  };
}) {
  const workstreams = [
    {
      title: "Candidate review",
      description: "CV + role",
      result: metrics.cvReady > 0 ? `${metrics.cvReady} analysed` : "",
      detail: candidates[0]?.decision ?? "Score a candidate against a job target.",
      tone: "info" as Tone,
      icon: FileText,
      view: "cv" as View,
    },
    {
      title: "CRM analysis",
      description: "CRM CSV",
      result: metrics.dealsNeedingAction > 0 ? `${metrics.dealsNeedingAction} actions` : "",
      detail: deals[0]?.action ?? "Find stalled deals and owner follow-ups.",
      tone: "warning" as Tone,
      icon: Database,
      view: "crm" as View,
    },
    {
      title: "Lead qualification",
      description: "ICP + source list",
      result: metrics.prospectsToReview > 0 ? `${metrics.prospectsReady} ready` : "",
      detail: prospects[0]?.nextAction ?? "Score prospects before CRM capture.",
      tone: "success" as Tone,
      icon: Target,
      view: "prospects" as View,
    },
  ];

  return (
    <div className="content-stack operations-workbench">
      <section className="ops-command-layout">
        <Card className="ops-command-card">
          <div className="ops-command-header">
            <div>
              <p className="eyebrow">Workflows</p>
              <h2>Start an analysis</h2>
            </div>
          </div>

          <div className="workstream-list">
            {workstreams.map((item) => (
              <WorkstreamRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                result={item.result}
                detail={item.detail}
                tone={item.tone}
                onOpen={() => setActiveView(item.view)}
              />
            ))}
          </div>

          <div className="ops-review-footer">
            {logs.length > 0 ? (
              <>
                <div>
                  <p className="eyebrow">Latest output</p>
                  <h3>{logs[0].workflow}</h3>
                  <p>{logs[0].result}</p>
                </div>
                <button className="text-button" type="button" onClick={() => setActiveView("logs")}>
                  View reviews
                </button>
              </>
            ) : (
              <p>Results and reviews will appear here after the first run.</p>
            )}
          </div>
        </Card>

        {logs.length > 1 ? (
          <Card className="review-panel-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Recent</p>
                <h3>Previous runs</h3>
              </div>
              <button className="text-button" type="button" onClick={() => setActiveView("logs")}>
                View all
              </button>
            </div>
            <div className="queue-list compact-queue">
              {logs.slice(0, 3).map((log) => (
                <button key={log.id} className="queue-item" type="button" onClick={() => setActiveView("logs")}>
                  <span className="queue-icon">
                    <ClipboardCheck size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{log.workflow}</strong>
                    <small>{log.result}</small>
                  </span>
                  <Badge tone={log.status === "Needs review" ? "warning" : "success"}>{log.status}</Badge>
                </button>
              ))}
            </div>
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function WorkstreamRow({
  icon: Icon,
  title,
  description,
  result,
  detail,
  tone,
  onOpen,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  result: string;
  detail: string;
  tone: Tone;
  onOpen: () => void;
}) {
  return (
    <button
      className={`workstream-row workstream-row-${tone} ${result ? "" : "workstream-row-empty"}`}
      type="button"
      onClick={onOpen}
    >
      <div className="workflow-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="workstream-copy">
        <span>
          <h3>{title}</h3>
          <p>{description}</p>
        </span>
        <small>{detail}</small>
      </div>
      {result ? (
        <div className="workstream-meta">
          <small>{result}</small>
        </div>
      ) : null}
    </button>
  );
}

function CvTool({
  candidates,
  selectedCandidate,
  setSelectedCandidateId,
  cvFileName,
  cvText,
  setCvText,
  jobRole,
  setJobRole,
  jobDescription,
  setJobDescription,
  onCvFile,
  runCvAnalysis,
  isRunning,
  onAction,
}: {
  candidates: CandidateMatch[];
  selectedCandidate: CandidateMatch | null;
  setSelectedCandidateId: (id: string) => void;
  cvFileName: string;
  cvText: string;
  setCvText: (value: string) => void;
  jobRole: string;
  setJobRole: (value: string) => void;
  jobDescription: string;
  setJobDescription: (value: string) => void;
  onCvFile: (file: File) => Promise<void>;
  runCvAnalysis: () => void;
  isRunning: boolean;
  onAction: (message: string) => void;
}) {
  return (
    <div className="content-stack">
      <section className="split-grid">
        <Card className="input-panel">
          <PanelTitle
            title="Candidate input"
            icon={UploadCloud}
          />
          <FileDrop
            label="Attach CV file"
            helper="Optional text, markdown, or CSV file"
            fileName={cvFileName}
            onFile={onCvFile}
            accept=".txt,.md,.csv"
          />
          <label className="field">
            <span>
              Paste CV text <small>required when no text file is uploaded</small>
            </span>
            <textarea
              rows={6}
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              placeholder="Paste the candidate CV text here."
            />
          </label>
        </Card>

        <Card className="input-panel">
          <PanelTitle
            title="Job target"
            icon={BriefcaseBusiness}
          />
          <label className="field">
            <span>
              Target role <small>required</small>
            </span>
            <input
              value={jobRole}
              onChange={(event) => setJobRole(event.target.value)}
              placeholder="Lead React Engineer, EMEA"
            />
          </label>
          <label className="field">
            <span>
              Job description <small>required</small>
            </span>
            <textarea
              rows={7}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description, scorecard, or key requirements."
            />
          </label>
          <Button className="full-button" onClick={runCvAnalysis} disabled={isRunning}>
            <PlayCircle size={16} aria-hidden="true" />
            {isRunning ? "Analyzing match..." : "Run match analysis"}
          </Button>
        </Card>
      </section>

      {candidates.length > 0 ? (
        <section className="dashboard-grid dashboard-grid-wide">
          <Card className="results-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Candidate ranking</p>
                <h3>Evidence-backed matches</h3>
              </div>
              <Badge tone="success">Review ready</Badge>
            </div>
            <div className="candidate-list">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`candidate-row ${
                    selectedCandidate?.id === candidate.id ? "candidate-row-active" : ""
                  }`}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                >
                  <div>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.title}</small>
                  </div>
                  <ScoreRing score={candidate.score} />
                  <Badge tone={candidate.score >= 85 ? "success" : "warning"}>{candidate.status}</Badge>
                </button>
              ))}
            </div>
          </Card>

          {selectedCandidate ? (
            <Card className="detail-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Match evidence</p>
                  <h3>{selectedCandidate.name}</h3>
                </div>
                <Badge tone="info">{confidenceLabel(selectedCandidate.score)}</Badge>
              </div>
              <p className="large-summary">{selectedCandidate.summary}</p>
              <CandidateArgumentPanel candidate={selectedCandidate} />
              <div className="evidence-grid">
                <EvidenceList title="Supporting evidence" items={selectedCandidate.evidence} tone="success" />
                <EvidenceList title="Gaps to review" items={selectedCandidate.gaps} tone="warning" />
              </div>
              <div className="dispatch-note">
                <Send size={18} aria-hidden="true" />
                <div>
                  <strong>Recommended dispatch</strong>
                  <p>{selectedCandidate.decision}</p>
                </div>
              </div>
              <div className="button-row">
                <Button onClick={() => onAction(`${selectedCandidate.name} marked ready for hiring manager review.`)}>
                  Mark ready
                </Button>
                <Button variant="secondary" onClick={() => onAction("Dispatch note copied to review queue.")}>
                  Copy note
                </Button>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function CrmAnalyzer({
  deals,
  pipeline,
  selectedDeal,
  setSelectedDealId,
  crmFileName,
  crmCsvText,
  setCrmCsvText,
  onCrmFile,
  runCrmAnalysis,
  isRunning,
  onAction,
}: {
  deals: Deal[];
  pipeline: Array<{ stage: string; value: number; stalled: number }>;
  selectedDeal: Deal | null;
  setSelectedDealId: (id: string) => void;
  crmFileName: string;
  crmCsvText: string;
  setCrmCsvText: (value: string) => void;
  onCrmFile: (file: File) => Promise<void>;
  runCrmAnalysis: () => void;
  isRunning: boolean;
  onAction: (message: string) => void;
}) {
  return (
    <div className="content-stack">
      <section className={deals.length > 0 ? "split-grid split-grid-narrow" : "single-panel"}>
        <Card className="input-panel">
          <PanelTitle
            title="CRM data"
            icon={Database}
          />
          <FileDrop
            label="Attach CRM CSV"
            helper="Optional CSV, TSV, or text file"
            fileName={crmFileName}
            onFile={onCrmFile}
            accept=".csv,.tsv,.txt"
          />
          <label className="field">
            <span>
              Paste CRM CSV <small>required when no CSV file is uploaded</small>
            </span>
            <textarea
              rows={6}
              value={crmCsvText}
              onChange={(event) => setCrmCsvText(event.target.value)}
              placeholder="company,owner,stage,value,last activity,next step&#10;Northstar Talent,A. Martin,Negotiation,42000,21 days,"
            />
          </label>
          <Button className="full-button" onClick={runCrmAnalysis} disabled={isRunning}>
            <PlayCircle size={16} aria-hidden="true" />
            {isRunning ? "Checking pipeline..." : "Run pipeline analysis"}
          </Button>
        </Card>

        {deals.length > 0 ? (
          <Card>
            <div className="metric-grid metric-grid-two">
              <Metric label="Active pipeline" value={summarizePipelineValue(deals)} helper={`${deals.length} open deals`} tone="info" />
              <Metric label="Needs action" value={String(deals.filter((deal) => deal.risk !== "Low").length)} helper="Owner follow-up required" tone="warning" />
              <Metric label="High risk" value={String(deals.filter((deal) => deal.risk === "High").length)} helper="Review before forecast" tone="danger" />
              <Metric label="Low risk" value={String(deals.filter((deal) => deal.risk === "Low").length)} helper="Ready to progress" tone="success" />
            </div>
            <div className="chart-wrap chart-wrap-small">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: chartColors.cursor }} />
                  <Bar dataKey="value" name="Open deals" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stalled" name="Needs action" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}
      </section>

      {deals.length > 0 ? (
        <section className="dashboard-grid dashboard-grid-wide">
          <Card>
            <div className="card-header">
              <div>
                <p className="eyebrow">Deals needing action</p>
                <h3>Prioritized by business risk</h3>
              </div>
              <Badge tone="warning">
                {deals.filter((deal) => deal.risk !== "Low").length} actions found
              </Badge>
            </div>
            <DataTable
              headers={["Company", "Stage", "Owner", "Value", "Risk", "Action"]}
              rows={deals.map((deal) => [
                <button className="table-link" type="button" onClick={() => setSelectedDealId(deal.id)}>
                  {deal.company}
                </button>,
                deal.stage,
                deal.owner,
                deal.value,
                <Badge tone={deal.risk === "High" ? "danger" : deal.risk === "Medium" ? "warning" : "success"}>
                  {deal.risk}
                </Badge>,
                deal.action,
              ])}
            />
          </Card>
          {selectedDeal ? (
            <Card className="detail-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Recommended next step</p>
                  <h3>{selectedDeal.company}</h3>
                </div>
                <Badge tone={selectedDeal.risk === "High" ? "danger" : "warning"}>{selectedDeal.risk} risk</Badge>
              </div>
              <dl className="compact-list">
                <div>
                  <dt>Stage</dt>
                  <dd>{selectedDeal.stage}</dd>
                </div>
                <div>
                  <dt>Expected value</dt>
                  <dd>{selectedDeal.value}</dd>
                </div>
                <div>
                  <dt>Last activity</dt>
                  <dd>{selectedDeal.lastActivity} ago</dd>
                </div>
                <div>
                  <dt>Close probability</dt>
                  <dd>{selectedDeal.probability}%</dd>
                </div>
              </dl>
              <DealReasonPanel deal={selectedDeal} />
              <div className="dispatch-note amber-note">
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <strong>Action to take</strong>
                  <p>{selectedDeal.action}</p>
                </div>
              </div>
              <div className="button-row">
                <Button onClick={() => onAction(`${selectedDeal.company} follow-up added to owner queue.`)}>
                  Add follow-up
                </Button>
                <Button variant="secondary" onClick={() => onAction(`${selectedDeal.company} marked reviewed.`)}>
                  Mark reviewed
                </Button>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ProspectTool({
  prospects,
  selectedProspect,
  setSelectedProspectId,
  prospectFileName,
  icpText,
  setIcpText,
  prospectSourceText,
  setProspectSourceText,
  manualProspectUrl,
  setManualProspectUrl,
  onProspectFile,
  onCaptureProspect,
  runProspectQualification,
  isRunning,
  onAction,
}: {
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  setSelectedProspectId: (id: string) => void;
  prospectFileName: string;
  icpText: string;
  setIcpText: (value: string) => void;
  prospectSourceText: string;
  setProspectSourceText: (value: string) => void;
  manualProspectUrl: string;
  setManualProspectUrl: (value: string) => void;
  onProspectFile: (file: File) => Promise<void>;
  onCaptureProspect: (prospect: Prospect) => Promise<void>;
  runProspectQualification: () => void;
  isRunning: boolean;
  onAction: (message: string) => void;
}) {
  return (
    <div className="content-stack">
      <section className="split-grid">
        <Card className="input-panel">
          <PanelTitle
            title="Define target customer"
            icon={Target}
          />
          <label className="field">
            <span>
              Ideal customer profile <small>required</small>
            </span>
            <textarea
              rows={7}
              value={icpText}
              onChange={(event) => setIcpText(event.target.value)}
              placeholder="B2B recruiting agencies, HR SaaS teams, and RevOps leaders with active hiring needs, CRM cleanup pain, or automation projects."
            />
          </label>
        </Card>
        <Card className="input-panel">
          <PanelTitle
            title="Prospect source"
            icon={Users}
          />
          <FileDrop
            label="Attach source file"
            helper="Optional CSV, notes, or company list"
            fileName={prospectFileName}
            onFile={onProspectFile}
            accept=".csv,.txt,.md"
          />
          <label className="field">
            <span>Paste prospect source</span>
            <textarea
              rows={5}
              value={prospectSourceText}
              onChange={(event) => setProspectSourceText(event.target.value)}
              placeholder="name,title,company,email,source&#10;Camille Roux,Head of Talent,ScaleWorks,camille@example.com,LinkedIn"
            />
          </label>
          <label className="field">
            <span>Manual company or profile URL</span>
            <input
              value={manualProspectUrl}
              onChange={(event) => setManualProspectUrl(event.target.value)}
              placeholder="https://example.com/company/scaleworks"
            />
          </label>
          <Button className="full-button" onClick={runProspectQualification} disabled={isRunning}>
            <PlayCircle size={16} aria-hidden="true" />
            {isRunning ? "Scoring prospects..." : "Run prospect qualification"}
          </Button>
        </Card>
      </section>

      {prospects.length > 0 ? (
        <section className="dashboard-grid dashboard-grid-wide">
          <Card>
            <div className="card-header">
              <div>
                <p className="eyebrow">Qualification results</p>
                <h3>Capture-ready prospects</h3>
              </div>
              <Badge tone="success">
                {prospects.filter((prospect) => prospect.status === "Capture now").length} ready
              </Badge>
            </div>
            <DataTable
              headers={["Prospect", "Company", "Source", "Fit", "Status", "Next action"]}
              rows={prospects.map((prospect) => [
                <button className="table-link" type="button" onClick={() => setSelectedProspectId(prospect.id)}>
                  {prospect.name}
                </button>,
                prospect.company,
                prospect.source,
                <ScorePill score={prospect.fit} />,
                <Badge tone={prospect.fit >= 90 ? "success" : prospect.fit >= 80 ? "warning" : "default"}>
                  {prospect.status}
                </Badge>,
                prospect.nextAction,
              ])}
            />
          </Card>
          {selectedProspect ? (
            <Card className="detail-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Lead analysis</p>
                  <h3>{selectedProspect.name}</h3>
                </div>
                <Badge tone={selectedProspect.fit >= 90 ? "success" : "warning"}>{selectedProspect.fit}% fit</Badge>
              </div>
              <dl className="compact-list">
                <div>
                  <dt>Role</dt>
                  <dd>{selectedProspect.title}</dd>
                </div>
                <div>
                  <dt>Company</dt>
                  <dd>{selectedProspect.company}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selectedProspect.source}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selectedProspect.email || "Missing"}</dd>
                </div>
              </dl>
              <p className="large-summary">{selectedProspect.reason}</p>
              <ProspectReasonPanel prospect={selectedProspect} />
              <div className="outreach-box">
                <Mail size={18} aria-hidden="true" />
                <div>
                  <strong>Outreach angle</strong>
                  <p>{selectedProspect.nextAction}</p>
                </div>
              </div>
              <Button
                className="full-button"
                onClick={() => {
                  void onCaptureProspect(selectedProspect);
                  onAction(`${selectedProspect.name} sent to the capture review queue.`);
                }}
              >
                <Database size={16} aria-hidden="true" />
                Capture to CRM after review
              </Button>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ActivityLogs({
  logs,
  selectedLog,
  setSelectedLogId,
}: {
  logs: RunLog[];
  selectedLog: RunLog | null;
  setSelectedLogId: (id: string) => void;
}) {
  return (
    <div className="content-stack">
      {logs.length > 0 ? (
        <section className="dashboard-grid dashboard-grid-wide">
          <Card>
            <div className="card-header">
              <div>
                <p className="eyebrow">Run history</p>
                <h3>Business-readable trace</h3>
              </div>
              <Badge tone="info">{logs.length} runs</Badge>
            </div>
            <DataTable
              headers={["Workflow", "Started", "Input", "Result", "Quality", "Review"]}
              rows={logs.map((log) => [
                <button className="table-link" type="button" onClick={() => setSelectedLogId(log.id)}>
                  {log.workflow}
                </button>,
                log.started,
                log.input,
                log.result,
                <Badge tone={qualityTone(log.quality) as Tone}>{log.quality}</Badge>,
                <Badge tone={log.status === "Needs review" ? "warning" : "success"}>{log.status}</Badge>,
              ])}
            />
          </Card>

          {selectedLog ? (
            <Card className="detail-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Analysis detail</p>
                  <h3>{selectedLog.workflow}</h3>
                </div>
                <Badge tone={selectedLog.status === "Needs review" ? "warning" : "success"}>
                  {selectedLog.status}
                </Badge>
              </div>
              <p className="large-summary">{selectedLog.details}</p>
              <EvidenceList title="Evidence used" items={selectedLog.evidence} tone="success" />
              <EvidenceList title="Data sources" items={selectedLog.dataUsed} tone="info" />
              <div className="dispatch-note">
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <strong>{selectedLog.quality}</strong>
                  <p>Reviewed with input summary, evidence, and source trace.</p>
                </div>
              </div>
              <details className="technical-details">
                <summary>Review details</summary>
                <dl className="compact-list">
                  <div>
                    <dt>Review record</dt>
                    <dd>{selectedLog.id}</dd>
                  </div>
                  <div>
                    <dt>Data used</dt>
                    <dd>{selectedLog.dataUsed.join(", ")}</dd>
                  </div>
                </dl>
              </details>
            </Card>
          ) : null}
        </section>
      ) : (
        <Card className="empty-page-card">
          <EmptyState title="No workflow runs yet" description="Run CV, CRM, or prospect analysis to create the first review record." />
        </Card>
      )}
    </div>
  );
}

function CandidateArgumentPanel({ candidate }: { candidate: CandidateMatch }) {
  const mission = candidate.roleMission;
  const candidateRead = candidate.candidateRead;
  const hasMission = Boolean(mission?.primaryMission || mission?.businessOutcomes?.length || mission?.successSignals?.length);
  const hasCandidateRead = Boolean(candidateRead?.trajectory || candidateRead?.strongestRelevantContext);
  const hasArguments = Boolean(candidate.fitArguments?.length);
  const hasQuestions = Boolean(candidate.followUpQuestions?.length);

  if (!hasMission && !hasCandidateRead && !hasArguments && !hasQuestions) return null;

  return (
    <div className="argument-panel">
      {hasMission ? (
        <div className="argument-section">
          <span>Role mission</span>
          {mission?.primaryMission ? <p>{mission.primaryMission}</p> : null}
          <ArgumentChips items={[...(mission?.businessOutcomes ?? []), ...(mission?.successSignals ?? [])]} />
        </div>
      ) : null}

      {hasCandidateRead ? (
        <div className="argument-section">
          <span>Candidate read</span>
          {candidateRead?.trajectory ? <p>{candidateRead.trajectory}</p> : null}
          {candidateRead?.strongestRelevantContext ? <p>{candidateRead.strongestRelevantContext}</p> : null}
        </div>
      ) : null}

      {hasArguments ? (
        <div className="argument-section">
          <span>Why this makes sense</span>
          <div className="argument-list">
            {candidate.fitArguments?.map((item, index) => (
              <div className="argument-item" key={`${item.point}-${index}`}>
                <strong>{item.point}</strong>
                {item.evidence ? <p>{item.evidence}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasQuestions ? (
        <div className="argument-section">
          <span>What to check next</span>
          <div className="argument-list">
            {candidate.followUpQuestions?.map((item, index) => (
              <div className="argument-item" key={`${item.question}-${index}`}>
                <strong>{item.question}</strong>
                {item.reason ? <p>{item.reason}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DealReasonPanel({ deal }: { deal: Deal }) {
  if (!deal.reason && !deal.evidence) return null;

  return (
    <div className="argument-panel argument-panel-amber">
      {deal.reason ? (
        <div className="argument-section">
          <span>Why this matters</span>
          <p>{deal.reason}</p>
        </div>
      ) : null}
      {deal.evidence ? (
        <div className="argument-section">
          <span>Signal found</span>
          <p>{deal.evidence}</p>
        </div>
      ) : null}
    </div>
  );
}

function ProspectReasonPanel({ prospect }: { prospect: Prospect }) {
  const hasEvidence = Boolean(prospect.evidence?.length);
  const hasMissingData = Boolean(prospect.missingData?.length);

  if (!hasEvidence && !hasMissingData) return null;

  return (
    <div className="argument-panel">
      {hasEvidence ? (
        <div className="argument-section">
          <span>Why this lead is worth attention</span>
          <ArgumentChips items={prospect.evidence ?? []} />
        </div>
      ) : null}
      {hasMissingData ? (
        <div className="argument-section">
          <span>Missing before capture</span>
          <ArgumentChips items={prospect.missingData ?? []} tone="warning" />
        </div>
      ) : null}
    </div>
  );
}

function ArgumentChips({ items, tone = "default" }: { items: string[]; tone?: "default" | "warning" }) {
  const cleanItems = items.filter(Boolean).slice(0, 5);
  if (!cleanItems.length) return null;

  return (
    <div className={`argument-chips argument-chips-${tone}`}>
      {cleanItems.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function PanelTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: typeof UploadCloud;
}) {
  return (
    <div className="panel-title">
      <div className="workflow-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

function FileDrop({
  label,
  helper,
  fileName,
  onFile,
}: {
  label: string;
  helper: string;
  fileName: string;
  onFile: (file: File) => Promise<void>;
  accept: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  return (
    <div
      className={`file-picker ${isDragging ? "file-picker-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <span>
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>
      <em>{fileName || "No file attached"}</em>
      <span className="file-picker-action">
        <UploadCloud size={16} aria-hidden="true" />
        Drop file
      </span>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`card ${className}`}>{children}</article>;
}

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled || undefined}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Metric({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <span
      className="score-ring"
      style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}
      aria-label={`${score}% score`}
    >
      {score}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  return <span className="score-pill">{score}%</span>;
}

function EvidenceList({ title, items, tone }: { title: string; items: string[]; tone: Tone }) {
  const Icon = tone === "warning" ? AlertTriangle : CheckCircle2;
  return (
    <div className="evidence-list">
      <h4>{title}</h4>
      {items.map((item) => (
        <div className="evidence-item" key={item}>
          <Icon size={16} aria-hidden="true" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildPipelineFromDeals(deals: Deal[]) {
  const stages = ["New", "Qualified", "Proposal", "Negotiation", "Won"].map((stage) => ({
    stage,
    value: 0,
    stalled: 0,
  }));
  const byStage = new Map(stages.map((stage) => [stage.stage.toLowerCase(), stage]));

  deals.forEach((deal) => {
    const key = deal.stage.toLowerCase();
    const point = byStage.get(key) ?? { stage: deal.stage, value: 0, stalled: 0 };
    point.value += 1;
    if (deal.risk !== "Low") point.stalled += 1;
    byStage.set(key, point);
  });

  return [...byStage.values()];
}

function summarizePipelineValue(deals: Deal[]) {
  return formatMoney(deals.reduce((sum, deal) => sum + parseMoney(deal.value), 0));
}

function parseMoney(value: string) {
  const numeric = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value: number) {
  if (value >= 1000) return `EUR ${Math.round(value / 1000)}k`;
  return `EUR ${Math.round(value)}`;
}

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
    reader.readAsText(file);
  });
}

export default App;
