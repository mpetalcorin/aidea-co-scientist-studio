import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Atom,
  Brain,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  Database,
  Dna,
  Download,
  ExternalLink,
  FlaskConical,
  GitBranch,
  Microscope,
  Moon,
  Network,
  Orbit,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  downloadBackendReport,
  generateHypotheses,
  getEvidenceMatrix,
  getMultiTargetIntelligence,
  type MultiTargetIntelligence,
  type TargetIntelligence,
} from "./lib/api";
import {
  deleteRun,
  downloadRunJson,
  getSavedRuns,
  saveRun,
  type SavedRun,
} from "./lib/storage";
import {
  buildGrantSummary,
  downloadHtmlReport,
  openHtmlReport,
} from "./lib/report";

type Hypothesis = {
  id: string;
  title: string;
  rationale: string;
  critique: string;
  improved: string;
  novelty: number;
  plausibility: number;
  feasibility: number;
  translation: number;
  evidence: number;
  risk: number;
};

type Agent = {
  name: string;
  icon: any;
  role: string;
  status: string;
  details: string;
  output: string;
};

const agents: Agent[] = [
  {
    name: "Question Agent",
    icon: Brain,
    role: "Converts broad scientific goals into precise biological questions.",
    status: "Active",
    details:
      "This agent transforms an open-ended biological problem into a narrower, testable research question with defined targets, disease context, and validation endpoints.",
    output:
      "Output: refined research question, target list, biological context, validation objective.",
  },
  {
    name: "Literature Agent",
    icon: Search,
    role: "Retrieves evidence from PubMed, ChEMBL, UniProt, Reactome, and clinical sources.",
    status: "Ready",
    details:
      "This agent retrieves and audits biomedical literature, protein annotations, compound activity records, and pathway relationships.",
    output:
      "Output: PubMed papers, source links, evidence matrix, confidence notes.",
  },
  {
    name: "Hypothesis Agent",
    icon: Sparkles,
    role: "Generates candidate hypotheses grounded in biology and datasets.",
    status: "Active",
    details:
      "This agent proposes mechanistically grounded hypotheses linking targets, pathways, disease biology, and therapeutic vulnerabilities.",
    output:
      "Output: ranked hypotheses, rationale, assumptions, and testable predictions.",
  },
  {
    name: "Mechanism Agent",
    icon: Network,
    role: "Maps genes, proteins, pathways, phenotypes, and drug targets.",
    status: "Ready",
    details:
      "This agent creates a target-pathway-compound graph using UniProt, Reactome, ChEMBL, and retrieved biological evidence.",
    output:
      "Output: mechanism map, target graph, pathway links, compound connections.",
  },
  {
    name: "Critic Agent",
    icon: ShieldCheck,
    role: "Challenges weak assumptions, missing controls, and unsupported claims.",
    status: "Reviewing",
    details:
      "This agent behaves like a peer reviewer, identifying missing controls, confounders, overclaims, biological compensation, and translational risks.",
    output:
      "Output: critique, limitations, control experiments, risk flags.",
  },
  {
    name: "Ranking Agent",
    icon: Trophy,
    role: "Scores hypotheses by novelty, feasibility, plausibility, evidence, and translation.",
    status: "Scoring",
    details:
      "This agent applies multi-objective scoring to prioritise hypotheses for scientific value, feasibility, evidence strength, and translational readiness.",
    output:
      "Output: tournament ranking, risk-adjusted scores, radar analytics.",
  },
  {
    name: "Evolution Agent",
    icon: GitBranch,
    role: "Combines and improves the strongest hypotheses into sharper proposals.",
    status: "Running",
    details:
      "This agent refines weak hypotheses, combines compatible ideas, and turns broad concepts into sharper experimental proposals.",
    output:
      "Output: evolved hypothesis, refined mechanism, stronger validation plan.",
  },
  {
    name: "Experiment Agent",
    icon: FlaskConical,
    role: "Designs wet-lab, computational, and translational validation plans.",
    status: "Ready",
    details:
      "This agent converts the selected hypothesis into wet-lab assays, omics analyses, computational validation, and translational next steps.",
    output:
      "Output: experiment plan, assays, biomarkers, datasets, expected readouts.",
  },
];

const defaultHypotheses: Hypothesis[] = [
  {
    id: "H1",
    title:
      "LDHA and MCT4 inhibition may expose redox fragility in BRCA2-deficient tumours.",
    rationale:
      "BRCA2-deficient cells rely on DNA repair compensation and may become vulnerable when glycolytic NAD+ regeneration and lactate export are disrupted.",
    critique:
      "Tumours may compensate through oxidative phosphorylation, glutamine metabolism, or stromal lactate exchange.",
    improved:
      "Test LDHA/MCT4 inhibition with ATR or PARP inhibition in BRCA2-deficient and BRCA2-restored isogenic cells, measuring viability, γH2AX, NAD+/NADH, lactate, OCR, ECAR, and rescue by pyruvate.",
    novelty: 84,
    plausibility: 89,
    feasibility: 92,
    translation: 81,
    evidence: 76,
    risk: 42,
  },
  {
    id: "H2",
    title:
      "POLQ-high ALT-positive tumours may be vulnerable to combined telomere stress and metabolic restriction.",
    rationale:
      "ALT-positive tumours experience telomeric replication stress and may depend on compensatory repair and energy metabolism to maintain survival.",
    critique:
      "ALT biology is heterogeneous, and not all ALT tumours depend equally on POLQ or metabolic rewiring.",
    improved:
      "Profile ALT markers, POLQ expression, lactate flux, mitochondrial respiration, and DNA damage after POLQ inhibition combined with glucose or glutamine restriction.",
    novelty: 91,
    plausibility: 82,
    feasibility: 74,
    translation: 73,
    evidence: 69,
    risk: 55,
  },
  {
    id: "H3",
    title:
      "Mitochondrial membrane potential stress may sensitize glycolytic tumour cells to replication stress therapy.",
    rationale:
      "Highly glycolytic cancer cells still require mitochondrial functions for biosynthesis, redox balance, apoptosis control, and stress adaptation.",
    critique:
      "Mitochondrial targeting has a narrow therapeutic index and may affect normal proliferating cells.",
    improved:
      "Use metabolic stratification to identify tumours with high glycolysis but preserved mitochondrial dependence, then test low-dose mitochondrial stress plus ATR inhibition.",
    novelty: 79,
    plausibility: 86,
    feasibility: 78,
    translation: 77,
    evidence: 72,
    risk: 61,
  },
  {
    id: "H4",
    title:
      "GLS inhibition may create a synthetic metabolic trap in DNA repair-defective tumours.",
    rationale:
      "Glutamine supports nucleotide biosynthesis, redox buffering, anaplerosis, and stress survival, all of which may become critical when DNA repair capacity is compromised.",
    critique:
      "Glutamine-addicted states are context-dependent and may vary strongly across tumour lineage and nutrient environment.",
    improved:
      "Test GLS inhibition across BRCA1/2, ATR-high, and POLQ-high models while monitoring nucleotide pools, replication fork speed, ROS, cell-cycle arrest, and rescue by nucleosides.",
    novelty: 82,
    plausibility: 88,
    feasibility: 84,
    translation: 79,
    evidence: 75,
    risk: 48,
  },
];

const exampleQuestions = [
  "Find testable hypotheses for exploiting lactate metabolism in BRCA2-deficient breast cancer.",
  "Identify synthetic lethal opportunities linking POLQ, ALT telomeres, and cancer metabolism.",
  "Prioritise drug repurposing hypotheses for GLS inhibition in DNA repair-defective tumours.",
  "Connect ATR inhibition, replication stress, mitochondrial function, and metabolic adaptation.",
];

const quickTargets = ["LDHA", "MCT4", "BRCA2", "RAD51", "POLQ", "ATR", "GLS", "HK2", "PKM2"];

const evidenceRows = [
  {
    claim: "BRCA2 loss creates homologous recombination deficiency.",
    source: "PubMed literature",
    strength: "High",
    limitation: "Context depends on genetic background.",
  },
  {
    claim: "LDHA supports lactate production and NAD+ regeneration.",
    source: "Cancer metabolism studies",
    strength: "High",
    limitation: "Compensation through oxidative metabolism may occur.",
  },
  {
    claim: "MCT4 exports lactate from glycolytic tumour cells.",
    source: "Transporter biology literature",
    strength: "Moderate",
    limitation: "Expression is tumour-type dependent.",
  },
  {
    claim: "ATR/PARP inhibition exploits replication stress and repair defects.",
    source: "DNA repair and oncology studies",
    strength: "High",
    limitation: "Resistance mechanisms can emerge.",
  },
];

const lineData = [
  { round: "R1", H1: 62, H2: 68, H3: 59, H4: 64 },
  { round: "R2", H1: 71, H2: 73, H3: 66, H4: 70 },
  { round: "R3", H1: 79, H2: 76, H3: 70, H4: 77 },
  { round: "R4", H1: 85, H2: 79, H3: 74, H4: 82 },
  { round: "R5", H1: 89, H2: 82, H3: 78, H4: 85 },
];

const clinicalReadiness = [
  { stage: "Mechanism", value: 88 },
  { stage: "Biomarker", value: 74 },
  { stage: "Drug availability", value: 81 },
  { stage: "Model systems", value: 86 },
  { stage: "Safety window", value: 62 },
  { stage: "Clinical path", value: 68 },
];

const heatmap = [
  [92, 84, 78, 72, 65],
  [86, 79, 74, 68, 61],
  [81, 76, 69, 63, 58],
  [88, 82, 77, 70, 64],
];

const graphNodes = [
  { label: "BRCA2", x: 16, y: 35, type: "repair" },
  { label: "RAD51", x: 31, y: 22, type: "repair" },
  { label: "ATR", x: 47, y: 38, type: "checkpoint" },
  { label: "LDHA", x: 28, y: 65, type: "metabolism" },
  { label: "MCT4", x: 45, y: 74, type: "metabolism" },
  { label: "Lactate", x: 62, y: 62, type: "metabolite" },
  { label: "POLQ", x: 68, y: 29, type: "repair" },
  { label: "Tumour stress", x: 82, y: 50, type: "phenotype" },
];

const graphEdges = [
  [0, 1],
  [1, 2],
  [0, 2],
  [3, 4],
  [4, 5],
  [2, 7],
  [5, 7],
  [6, 7],
  [3, 7],
];

function score(h: Hypothesis) {
  return Math.round(
    (h.novelty +
      h.plausibility +
      h.feasibility +
      h.translation +
      h.evidence -
      h.risk * 0.35) /
      4.65
  );
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function buildProposalText(selected: Hypothesis) {
  return `
aAidea Co-Scientist Studio
Research Proposal Export

Selected Hypothesis:
${selected.title}

Rationale:
${selected.rationale}

Critical Review:
${selected.critique}

Improved Testable Hypothesis:
${selected.improved}

Scores:
Novelty: ${selected.novelty}
Biological Plausibility: ${selected.plausibility}
Experimental Feasibility: ${selected.feasibility}
Translational Value: ${selected.translation}
Evidence Strength: ${selected.evidence}
Risk: ${selected.risk}
Overall Score: ${score(selected)}

Suggested Validation Plan:
1. Select isogenic cancer models with defined DNA repair status.
2. Confirm baseline expression of LDHA, MCT4, BRCA2, POLQ, RAD51, GLS, and ATR pathway markers.
3. Measure metabolic phenotype using lactate secretion, OCR, ECAR, ATP, NAD+/NADH, ROS, and nucleotide pools.
4. Test single-agent and combination perturbations.
5. Measure viability, apoptosis, replication stress, γH2AX, RAD51 foci, and rescue conditions.
6. Use SHAP or feature attribution to connect biomarkers to drug response.
7. Prioritise combinations with tumour-selective activity and mechanistic coherence.

Generated by aAidea Co-Scientist Studio.
`;
}

function exportProposal(selected: Hypothesis) {
  const blob = new Blob([buildProposalText(selected)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aidea-co-scientist-proposal.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState(exampleQuestions[0]);
  const [selectedId, setSelectedId] = useState("H1");
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(defaultHypotheses);
  const [backendStatus, setBackendStatus] = useState("Frontend simulation mode");
  const [livePapers, setLivePapers] = useState<any[]>([]);
  const [liveEvidence, setLiveEvidence] = useState<any[]>([]);
  const [targetIntel, setTargetIntel] = useState<TargetIntelligence[]>([]);
  const [targetGraph, setTargetGraph] = useState<MultiTargetIntelligence["graph"] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [copied, setCopied] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>(() => getSavedRuns());
  const [workspaceMessage, setWorkspaceMessage] = useState("No project saved yet");

  const selected = useMemo(
    () => hypotheses.find((h) => h.id === selectedId) ?? hypotheses[0],
    [selectedId, hypotheses]
  );

  const tournamentData = hypotheses.map((h) => ({
    name: h.id,
    Novelty: h.novelty,
    Plausibility: h.plausibility,
    Feasibility: h.feasibility,
    Translation: h.translation,
    Evidence: h.evidence,
    Risk: h.risk,
    Score: score(h),
  }));

  const radarData = [
    { metric: "Novelty", value: selected.novelty },
    { metric: "Plausibility", value: selected.plausibility },
    { metric: "Feasibility", value: selected.feasibility },
    { metric: "Translation", value: selected.translation },
    { metric: "Evidence", value: selected.evidence },
    { metric: "Low risk", value: 100 - selected.risk },
  ];

  const scatterData = hypotheses.map((h) => ({
    x: h.novelty,
    y: h.feasibility,
    z: h.translation,
    name: h.id,
  }));

  async function runAgentCoalition() {
    try {
      setIsRunning(true);
      setRunProgress(12);
      setBackendStatus("Calling FastAPI backend...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setRunProgress(35);
      setBackendStatus("Retrieving PubMed evidence...");
      const result = await generateHypotheses(query);

      setRunProgress(58);
      setBackendStatus("Building evidence matrix...");
      const evidenceResult = await getEvidenceMatrix(query);

      setRunProgress(76);
      setBackendStatus("Connecting ChEMBL, UniProt, and Reactome...");
      setHypotheses(result.hypotheses as Hypothesis[]);
      setLivePapers(result.papers_used || []);
      setLiveEvidence(evidenceResult.evidence || []);
      setTargetIntel(result.target_intelligence || []);
      const detectedTargets =
        result.detected_targets?.length ? result.detected_targets : ["LDHA", "BRCA2", "ATR", "GLS"];
      const multi = await getMultiTargetIntelligence(detectedTargets.slice(0, 5));
      setTargetGraph(multi.graph);

      setRunProgress(100);
      setSelectedId(result.hypotheses?.[0]?.id || "H1");
      setBackendStatus("Live backend mode, evidence-grounded retrieval completed");

      const saved = saveRun({
        question: query,
        hypotheses: result.hypotheses || [],
        livePapers: result.papers_used || [],
        liveEvidence: evidenceResult.evidence || [],
        targetIntel: result.target_intelligence || [],
        targetGraph: multi.graph,
      });

      setSavedRuns(getSavedRuns());
      setWorkspaceMessage(`Saved project run: ${saved.id.slice(0, 8)}`);
      setTimeout(() => scrollToId("workspace"), 400);
    } catch (error) {
      console.error(error);
      setBackendStatus("Backend unavailable, still showing frontend simulation");
      setRunProgress(0);
    } finally {
      setIsRunning(false);
    }
  }

  function currentWorkspace() {
    return {
      question: query,
      hypotheses,
      livePapers,
      liveEvidence,
      targetIntel,
      targetGraph,
    };
  }

  async function copyProposal() {
    await navigator.clipboard.writeText(buildProposalText(selected));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function copyGrantSummary() {
    await navigator.clipboard.writeText(buildGrantSummary(currentWorkspace()));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function resetDemo() {
    setHypotheses(defaultHypotheses);
    setSelectedId("H1");
    setLivePapers([]);
    setLiveEvidence([]);
    setTargetIntel([]);
    setTargetGraph(null);
    setBackendStatus("Frontend simulation mode");
    setRunProgress(0);
    setWorkspaceMessage("Workspace reset to frontend simulation mode");
  }

  function loadSavedRun(run: SavedRun) {
    setQuery(run.question);
    setHypotheses(run.hypotheses?.length ? run.hypotheses : defaultHypotheses);
    setSelectedId(run.hypotheses?.[0]?.id || "H1");
    setLivePapers(run.livePapers || []);
    setLiveEvidence(run.liveEvidence || []);
    setTargetIntel(run.targetIntel || []);
    setTargetGraph(run.targetGraph || null);
    setBackendStatus("Loaded saved workspace from browser storage");
    setWorkspaceMessage(`Loaded saved run: ${run.id.slice(0, 8)}`);
    setTimeout(() => scrollToId("top"), 300);
  }

  function removeSavedRun(id: string) {
    const next = deleteRun(id);
    setSavedRuns(next);
    setWorkspaceMessage("Saved run deleted");
  }

  function addTargetToQuery(target: string) {
    const next = query.includes(target)
      ? query
      : `${query.trim()} ${query.trim().endsWith(".") ? "" : "."} Include ${target}.`;
    setQuery(next);
  }

  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 transition-colors duration-500 dark:bg-slate-950 dark:text-white">
        <div className="pointer-events-none fixed inset-0 opacity-80">
          <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-400 blur-3xl dark:bg-indigo-700" />
          <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-fuchsia-300 blur-3xl dark:bg-fuchsia-700" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-300 blur-3xl dark:bg-cyan-800" />
        </div>

        <section className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <nav className="sticky top-4 z-40 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-xl glass dark:border-white/10 dark:bg-white/10">
            <button onClick={() => scrollToId("top")} className="flex items-center gap-3 text-left">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-glow dark:bg-white dark:text-slate-950"
              >
                <Atom className="h-6 w-6" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-300">
                  aAidea
                </p>
                <h1 className="text-lg font-black sm:text-xl">Co-Scientist Studio</h1>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <NavButton label="Workspace" onClick={() => scrollToId("workspace")} />
              <NavButton label="Targets" onClick={() => scrollToId("target-intelligence")} />
              <NavButton label="Graph" onClick={() => scrollToId("live-graph")} />
              <NavButton label="Evidence" onClick={() => scrollToId("live-evidence")} />
              <NavButton label="Analytics" onClick={() => scrollToId("analytics")} />
              <button
                onClick={() => setDark((v) => !v)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {dark ? "Light" : "Dark"}
              </button>
            </div>
          </nav>

          <div id="top" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/50 bg-white/75 p-7 shadow-2xl glass dark:border-white/10 dark:bg-white/10"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                <Sparkles className="h-4 w-4" />
                Multi-agent hypothesis generation for biomedical discovery
              </div>

              <h2 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Turn complex biology into ranked, testable research hypotheses.
              </h2>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                Click the agents, run live evidence retrieval, open scientific links, add targets, copy proposals, and navigate through animated biomedical analytics.
              </p>

              <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-950/70">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <ClipboardList className="h-4 w-4" />
                  Research question
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {exampleQuestions.map((item, idx) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:-translate-y-1 hover:shadow-md dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                    >
                      Example {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {quickTargets.map((target) => (
                    <button
                      key={target}
                      onClick={() => addTargetToQuery(target)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black transition hover:-translate-y-1 hover:bg-slate-950 hover:text-white dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-950"
                    >
                      + {target}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {isRunning && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs font-black text-cyan-700 dark:text-cyan-200">
                        <span>Agent coalition running</span>
                        <span>{runProgress}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
                        <motion.div
                          className="h-full rounded-full bg-cyan-500"
                          animate={{ width: `${runProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={runAgentCoalition}
                    disabled={isRunning}
                    className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    <Play className="h-4 w-4" />
                    {isRunning ? "Running agents..." : "Run agent coalition"}
                  </button>

                  <span className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-black text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                    {backendStatus}
                  </span>

                  <button
                    onClick={() => exportProposal(selected)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                  >
                    <Download className="h-4 w-4" />
                    Export proposal
                  </button>

                  <button
                    onClick={copyProposal}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                  >
                    {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy proposal"}
                  </button>

                  <button
                    onClick={() => openHtmlReport(currentWorkspace())}
                    className="flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm transition hover:scale-105 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open report
                  </button>

                  <button
                    onClick={() => downloadHtmlReport(currentWorkspace())}
                    className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:scale-105 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    <Download className="h-4 w-4" />
                    Download HTML report
                  </button>

                  <button
                    onClick={() => downloadBackendReport(currentWorkspace(), "docx")}
                    className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 shadow-sm transition hover:scale-105 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                  >
                    <Download className="h-4 w-4" />
                    Download DOCX
                  </button>

                  <button
                    onClick={() => downloadBackendReport(currentWorkspace(), "pdf")}
                    className="flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-black text-orange-700 shadow-sm transition hover:scale-105 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>

                  <button
                    onClick={copyGrantSummary}
                    className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-black text-violet-700 shadow-sm transition hover:scale-105 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
                  >
                    <Clipboard className="h-4 w-4" />
                    Copy grant summary
                  </button>

                  <button
                    onClick={resetDemo}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 shadow-sm transition hover:scale-105 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[2rem] border border-white/50 bg-slate-950 p-7 text-white shadow-2xl glass dark:border-white/10"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-black">Live agent coalition</h3>
                <Activity className="h-6 w-6 animate-pulse text-cyan-300" />
              </div>

              <div className="grid gap-3">
                {agents.map((agent, idx) => {
                  const Icon = agent.icon;
                  return (
                    <motion.button
                      key={agent.name}
                      onClick={() => setActiveAgent(agent)}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.035 }}
                      whileHover={{ x: 8, scale: 1.01 }}
                      className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-left transition hover:bg-white/15"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black">{agent.name}</p>
                          <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs font-bold text-emerald-200">
                            {agent.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{agent.role}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Hypotheses ranked" value={String(hypotheses.length)} icon={Trophy} subtitle="Tournament mode" />
            <MetricCard title="Live papers" value={String(livePapers.length)} icon={Search} subtitle="PubMed retrieval" />
            <MetricCard title="Targets mapped" value={String(targetIntel.length || 6)} icon={Target} subtitle="UniProt, ChEMBL, Reactome" />
            <MetricCard title="Best score" value={`${score(selected)}`} icon={Zap} subtitle={selected.id} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            {hypotheses.map((h) => (
              <motion.button
                key={h.id}
                onClick={() => {
                  setSelectedId(h.id);
                  scrollToId("selected-hypothesis");
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={classNames(
                  "rounded-[1.75rem] border p-5 text-left shadow-xl transition",
                  selectedId === h.id
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-300 dark:bg-indigo-500/20"
                    : "border-white/50 bg-white/75 dark:border-white/10 dark:bg-white/10"
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                    {h.id}
                  </span>
                  <span className="text-3xl font-black">{score(h)}</span>
                </div>
                <h3 className="text-lg font-black leading-6">{h.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {h.rationale}
                </p>
              </motion.button>
            ))}
          </div>


          <section id="workspace" className="mt-6 rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-indigo-500" />
                <div>
                  <h3 className="text-2xl font-black">Saved project workspace</h3>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {workspaceMessage}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const saved = saveRun({
                      question: query,
                      hypotheses,
                      livePapers,
                      liveEvidence,
                      targetIntel,
                      targetGraph,
                    });
                    setSavedRuns(getSavedRuns());
                    setWorkspaceMessage(`Manually saved run: ${saved.id.slice(0, 8)}`);
                  }}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:scale-105 dark:bg-white dark:text-slate-950"
                >
                  Save current run
                </button>

                <button
                  onClick={() => {
                    const blob = new Blob([
                      JSON.stringify(
                        {
                          question: query,
                          hypotheses,
                          livePapers,
                          liveEvidence,
                          targetIntel,
                          targetGraph,
                          exportedAt: new Date().toISOString(),
                        },
                        null,
                        2
                      ),
                    ], { type: "application/json;charset=utf-8" });

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "aidea-current-workspace.json";
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                >
                  Download current JSON
                </button>
              </div>
            </div>

            {savedRuns.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900">
                <h4 className="font-black">No saved runs yet</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Run the agent coalition or click Save current run to create a reusable project workspace.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {savedRuns.map((run) => (
                  <motion.div
                    key={run.id}
                    whileHover={{ y: -5 }}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                          {new Date(run.createdAt).toLocaleString()}
                        </p>
                        <h4 className="mt-2 text-lg font-black leading-6">
                          {run.question}
                        </h4>
                      </div>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                        {run.hypotheses?.length || 0} hypotheses
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <MiniStat label="Papers" value={String(run.livePapers?.length || 0)} />
                      <MiniStat label="Evidence" value={String(run.liveEvidence?.length || 0)} />
                      <MiniStat label="Targets" value={String(run.targetIntel?.length || 0)} />
                      <MiniStat label="Graph nodes" value={String(run.targetGraph?.nodes?.length || 0)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => loadSavedRun(run)}
                        className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:scale-105"
                      >
                        Load run
                      </button>
                      <button
                        onClick={() => downloadRunJson(run)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                      >
                        Download JSON
                      </button>

                      <button
                        onClick={() =>
                          openHtmlReport({
                            question: run.question,
                            hypotheses: run.hypotheses || [],
                            livePapers: run.livePapers || [],
                            liveEvidence: run.liveEvidence || [],
                            targetIntel: run.targetIntel || [],
                            targetGraph: run.targetGraph || null,
                          })
                        }
                        className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-700 transition hover:scale-105 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200"
                      >
                        Open report
                      </button>

                      <button
                        onClick={() =>
                          downloadHtmlReport({
                            question: run.question,
                            hypotheses: run.hypotheses || [],
                            livePapers: run.livePapers || [],
                            liveEvidence: run.liveEvidence || [],
                            targetIntel: run.targetIntel || [],
                            targetGraph: run.targetGraph || null,
                          })
                        }
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:scale-105 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      >
                        HTML report
                      </button>

                      <button
                        onClick={() =>
                          downloadBackendReport({
                            question: run.question,
                            hypotheses: run.hypotheses || [],
                            livePapers: run.livePapers || [],
                            liveEvidence: run.liveEvidence || [],
                            targetIntel: run.targetIntel || [],
                            targetGraph: run.targetGraph || null,
                          }, "docx")
                        }
                        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:scale-105 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                      >
                        DOCX
                      </button>

                      <button
                        onClick={() =>
                          downloadBackendReport({
                            question: run.question,
                            hypotheses: run.hypotheses || [],
                            livePapers: run.livePapers || [],
                            liveEvidence: run.liveEvidence || [],
                            targetIntel: run.targetIntel || [],
                            targetGraph: run.targetGraph || null,
                          }, "pdf")
                        }
                        className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 transition hover:scale-105 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => removeSavedRun(run.id)}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:scale-105 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section id="target-intelligence" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Target className="h-6 w-6 text-rose-500" />
                <h3 className="text-2xl font-black">Live target intelligence</h3>
              </div>

              {targetIntel.length === 0 ? (
                <EmptyState
                  title="No live target intelligence yet"
                  text="Run the agent coalition to retrieve UniProt, ChEMBL, and Reactome intelligence for detected targets."
                  action="Run now"
                  onClick={runAgentCoalition}
                />
              ) : (
                <div className="grid gap-4">
                  {targetIntel.map((item) => (
                    <motion.div
                      key={item.summary.target}
                      whileHover={{ y: -5 }}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                            Target intelligence score
                          </p>
                          <h4 className="mt-1 text-3xl font-black">{item.summary.target}</h4>
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-2xl font-black text-white dark:bg-white dark:text-slate-950">
                          {item.summary.target_intelligence_score}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                        {item.summary.description}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MiniStat label="UniProt" value={item.summary.uniprot_available ? "Yes" : "No"} />
                        <MiniStat label="ChEMBL targets" value={String(item.summary.chembl_targets_found)} />
                        <MiniStat label="Reactome pathways" value={String(item.summary.reactome_pathways_found)} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.uniprot?.url && <ResourceLink href={item.uniprot.url} label="Open UniProt" tone="indigo" />}
                        {item.chembl?.targets?.[0]?.url && <ResourceLink href={item.chembl.targets[0].url} label="Open ChEMBL" tone="emerald" />}
                        {item.reactome?.pathways?.[0]?.url && <ResourceLink href={item.reactome.pathways[0].url} label="Open Reactome" tone="rose" />}
                        <ResourceLink href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(item.summary.target + " cancer")}`} label="Search PubMed" tone="cyan" />
                      </div>

                      {item.compounds.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-sm font-black">Top ChEMBL bioactivity records</p>
                          <div className="grid gap-2">
                            {item.compounds.slice(0, 3).map((compound) => (
                              <a
                                key={`${item.summary.target}-${compound.molecule_chembl_id}-${compound.standard_value}`}
                                href={compound.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
                              >
                                <span className="font-black">{compound.molecule_chembl_id}</span>
                                {" • "}
                                {compound.standard_type} {compound.standard_value} {compound.standard_units}
                                <ExternalLink className="ml-2 inline h-3 w-3 opacity-60 group-hover:opacity-100" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div id="live-graph" className="rounded-[2rem] border border-white/50 bg-slate-950 p-6 text-white shadow-xl glass dark:border-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Network className="h-6 w-6 text-cyan-300" />
                <h3 className="text-2xl font-black">Live target-pathway-compound graph</h3>
              </div>

              {!targetGraph ? (
                <EmptyStateDark
                  title="Graph waiting for live data"
                  text="Run the agent coalition to build a graph from ChEMBL compounds, UniProt targets, and Reactome pathways."
                  action="Build graph"
                  onClick={runAgentCoalition}
                />
              ) : (
                <div className="relative h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">
                  {targetGraph.edges.slice(0, 25).map((edge, idx) => {
                    const sourceIndex = targetGraph.nodes.findIndex((n) => n.id === edge.source);
                    const targetIndex = targetGraph.nodes.findIndex((n) => n.id === edge.target);
                    if (sourceIndex < 0 || targetIndex < 0) return null;
                    const sourceAngle = (sourceIndex / Math.max(targetGraph.nodes.length, 1)) * Math.PI * 2;
                    const targetAngle = (targetIndex / Math.max(targetGraph.nodes.length, 1)) * Math.PI * 2;
                    const sx = 50 + Math.cos(sourceAngle) * 34;
                    const sy = 50 + Math.sin(sourceAngle) * 34;
                    const tx = 50 + Math.cos(targetAngle) * 34;
                    const ty = 50 + Math.sin(targetAngle) * 34;

                    return (
                      <motion.div
                        key={`${edge.source}-${edge.target}-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: idx * 0.03 }}
                        className="absolute h-0.5 origin-left bg-white/40"
                        style={{
                          left: `${sx}%`,
                          top: `${sy}%`,
                          width: `${Math.hypot(tx - sx, ty - sy)}%`,
                          transform: `rotate(${Math.atan2(ty - sy, tx - sx)}rad)`,
                        }}
                      />
                    );
                  })}

                  {targetGraph.nodes.slice(0, 30).map((node, idx) => {
                    const angle = (idx / Math.max(targetGraph.nodes.length, 1)) * Math.PI * 2;
                    const x = 50 + Math.cos(angle) * 34;
                    const y = 50 + Math.sin(angle) * 34;

                    return (
                      <motion.div
                        key={node.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.16, zIndex: 30 }}
                        transition={{ delay: idx * 0.035, type: "spring" }}
                        className={
                          "absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border p-2 text-center text-[10px] font-black leading-tight shadow-2xl " +
                          (node.type === "target"
                            ? "border-violet-300 bg-violet-500/90"
                            : node.type === "compound"
                            ? "border-emerald-300 bg-emerald-500/90"
                            : "border-cyan-300 bg-cyan-500/90")
                        }
                        style={{ left: `${x}%`, top: `${y}%` }}
                        title={`${node.type}: ${node.label}`}
                      >
                        {node.label.length > 28 ? node.label.slice(0, 28) + "..." : node.label}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section id="selected-hypothesis" className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Target className="h-6 w-6 text-indigo-500" />
                <h3 className="text-2xl font-black">Selected hypothesis</h3>
              </div>

              <div className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-black/40">
                <p className="text-sm font-bold text-indigo-200">{selected.id}</p>
                <h4 className="mt-2 text-2xl font-black leading-8">{selected.title}</h4>
              </div>

              <div className="mt-4 space-y-4">
                <InfoBlock title="Mechanistic rationale" text={selected.rationale} />
                <InfoBlock title="Virtual peer review" text={selected.critique} />
                <InfoBlock title="Evolved testable version" text={selected.improved} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h3 className="text-2xl font-black">Risk-adjusted scoring radar</h3>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name={selected.id} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section id="analytics" className="mt-6 grid gap-6 lg:grid-cols-2">
            <AnalyticsPanel title="Elo-style idea evolution" icon={Zap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis domain={[50, 95]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="H1" stroke="#ec4899" strokeWidth={3} />
                  <Line type="monotone" dataKey="H2" stroke="#06b6d4" strokeWidth={3} />
                  <Line type="monotone" dataKey="H3" stroke="#8b5cf6" strokeWidth={3} />
                  <Line type="monotone" dataKey="H4" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </AnalyticsPanel>

            <AnalyticsPanel title="Hypothesis comparison" icon={Database}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tournamentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="Novelty" fill="#a855f7" />
                  <Bar dataKey="Plausibility" fill="#06b6d4" />
                  <Bar dataKey="Feasibility" fill="#22c55e" />
                  <Bar dataKey="Translation" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsPanel>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <AnalyticsPanel title="Multi-objective optimisation landscape" icon={Orbit}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Novelty" domain={[70, 95]} />
                  <YAxis type="number" dataKey="y" name="Feasibility" domain={[65, 95]} />
                  <ZAxis type="number" dataKey="z" range={[180, 650]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Hypotheses" data={scatterData} fill="#ec4899" />
                </ScatterChart>
              </ResponsiveContainer>
            </AnalyticsPanel>

            <AnalyticsPanel title="Clinical translation readiness" icon={Microscope}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clinicalReadiness}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.35} />
                </AreaChart>
              </ResponsiveContainer>
            </AnalyticsPanel>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/50 bg-slate-950 p-6 text-white shadow-xl glass dark:border-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Network className="h-6 w-6 text-cyan-300" />
                <h3 className="text-2xl font-black">Biomedical knowledge graph</h3>
              </div>

              <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">
                {graphEdges.map(([a, b], i) => {
                  const n1 = graphNodes[a];
                  const n2 = graphNodes[b];
                  return (
                    <motion.div
                      key={`${a}-${b}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.65 }}
                      transition={{ delay: i * 0.08 }}
                      className="absolute h-0.5 origin-left bg-white/40"
                      style={{
                        left: `${n1.x}%`,
                        top: `${n1.y}%`,
                        width: `${Math.hypot(n2.x - n1.x, n2.y - n1.y)}%`,
                        transform: `rotate(${Math.atan2(n2.y - n1.y, n2.x - n1.x)}rad)`,
                      }}
                    />
                  );
                })}

                {graphNodes.map((node, idx) => (
                  <motion.div
                    key={node.label}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.15 }}
                    transition={{ delay: idx * 0.08, type: "spring" }}
                    className={classNames(
                      "absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border text-xs font-black shadow-2xl",
                      node.type === "repair" && "border-violet-300 bg-violet-500/80",
                      node.type === "metabolism" && "border-emerald-300 bg-emerald-500/80",
                      node.type === "metabolite" && "border-cyan-300 bg-cyan-500/80",
                      node.type === "checkpoint" && "border-amber-300 bg-amber-500/80",
                      node.type === "phenotype" && "border-rose-300 bg-rose-500/80"
                    )}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    title={node.label}
                  >
                    {node.label}
                  </motion.div>
                ))}

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <h3 className="text-2xl font-black">Evidence confidence heatmap</h3>
              </div>

              <div className="grid gap-3">
                {heatmap.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-5 gap-3">
                    {row.map((value, colIndex) => (
                      <motion.div
                        key={`${rowIndex}-${colIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.08 }}
                        transition={{ delay: (rowIndex + colIndex) * 0.04 }}
                        className={classNames(
                          "flex h-20 cursor-pointer items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg",
                          value >= 85 && "bg-emerald-500",
                          value >= 75 && value < 85 && "bg-cyan-500",
                          value >= 65 && value < 75 && "bg-amber-500",
                          value < 65 && "bg-rose-500"
                        )}
                      >
                        {value}
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Legend label="High confidence" className="bg-emerald-500" />
                <Legend label="Good support" className="bg-cyan-500" />
                <Legend label="Needs validation" className="bg-amber-500" />
                <Legend label="High uncertainty" className="bg-rose-500" />
              </div>
            </div>
          </section>

          <section id="live-evidence" className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Search className="h-6 w-6 text-indigo-500" />
                <h3 className="text-2xl font-black">Live PubMed papers</h3>
              </div>
              <div className="space-y-3">
                {livePapers.length === 0 ? (
                  <EmptyState title="No live PubMed papers yet" text="Run the agent coalition to retrieve live PubMed evidence from the backend." action="Retrieve papers" onClick={runAgentCoalition} />
                ) : (
                  livePapers.slice(0, 5).map((paper: any) => (
                    <a
                      key={paper.pmid || paper.title}
                      href={paper.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-300">
                        PMID {paper.pmid || "N/A"} • {paper.journal} • {paper.year}
                      </p>
                      <h4 className="mt-2 font-black leading-6">
                        {paper.title}
                        <ExternalLink className="ml-2 inline h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </h4>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {paper.abstract || "No abstract retrieved."}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Database className="h-6 w-6 text-emerald-500" />
                <h3 className="text-2xl font-black">Live evidence audit</h3>
              </div>
              <div className="space-y-3">
                {liveEvidence.length === 0 ? (
                  <EmptyState title="Evidence audit waiting" text="Evidence audit will appear here after backend retrieval." action="Run audit" onClick={runAgentCoalition} />
                ) : (
                  liveEvidence.slice(0, 5).map((row: any, idx: number) => (
                    <a
                      key={idx}
                      href={row.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-300">
                        {row.strength} evidence • {row.source}
                      </p>
                      <h4 className="mt-2 font-black leading-6">
                        {row.claim}
                        <ExternalLink className="ml-2 inline h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {row.limitation}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Dna className="h-6 w-6 text-fuchsia-500" />
                <h3 className="text-2xl font-black">Static evidence matrix</h3>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-950 text-white dark:bg-black/50">
                    <tr>
                      <th className="p-4">Claim</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Strength</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceRows.map((row) => (
                      <tr key={row.claim} className="border-t border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
                        <td className="p-4 font-semibold">{row.claim}</td>
                        <td className="p-4">{row.source}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            {row.strength}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
              <div className="mb-5 flex items-center gap-3">
                <Orbit className="h-6 w-6 text-emerald-500" />
                <h3 className="text-2xl font-black">Portfolio balance</h3>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Cancer metabolism", value: 34 },
                        { name: "DNA repair", value: 28 },
                        { name: "Mitochondria", value: 20 },
                        { name: "Drug repurposing", value: 18 },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={5}
                    >
                      <Cell fill="#ec4899" />
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#06b6d4" />
                      <Cell fill="#22c55e" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <footer className="relative mt-8 rounded-[2rem] border border-white/50 bg-slate-950 p-6 text-white shadow-2xl dark:border-white/10">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">
              Researcher-controlled AI
            </p>
            <h3 className="mt-2 text-2xl font-black">
              Built for transparent biomedical hypothesis generation.
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              Buttons now run backend retrieval, open scientific links, copy proposals, reset the demo, navigate to modules, and inspect agents. The next upgrade is persistent project storage, PDF reports, and saved hypothesis workspaces.
            </p>
          </footer>
        </section>

        <AnimatePresence>
          {activeAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
              onClick={() => setActiveAgent(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-2xl rounded-[2rem] border border-white/20 bg-white p-7 text-slate-950 shadow-2xl dark:bg-slate-950 dark:text-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <activeAgent.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                        Agent detail
                      </p>
                      <h3 className="text-3xl font-black">{activeAgent.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveAgent(null)}
                    className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mt-5 text-lg leading-8 text-slate-700 dark:text-slate-300">
                  {activeAgent.details}
                </p>

                <div className="mt-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                  <p className="font-black text-indigo-700 dark:text-indigo-200">
                    {activeAgent.output}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setActiveAgent(null);
                      runAgentCoalition();
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 dark:bg-white dark:text-slate-950"
                  >
                    <Play className="h-4 w-4" />
                    Run this workflow
                  </button>
                  <button
                    onClick={() => {
                      setActiveAgent(null);
                      scrollToId("analytics");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:scale-105 dark:border-white/10 dark:bg-slate-900"
                  >
                    View analytics
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition hover:-translate-y-1 hover:bg-slate-950 hover:text-white dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-950"
    >
      {label}
    </button>
  );
}

function ResourceLink({ href, label, tone }: { href: string; label: string; tone: "indigo" | "emerald" | "rose" | "cyan" }) {
  const styles = {
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition hover:-translate-y-1 hover:shadow-md ${styles[tone]}`}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      className="rounded-[1.75rem] border border-white/50 bg-white/80 p-5 shadow-xl glass dark:border-white/10 dark:bg-white/10"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <Icon className="h-6 w-6" />
        </div>
        <motion.p initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="text-4xl font-black">
          {value}
        </motion.p>
      </div>
      <p className="mt-4 font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
    </motion.div>
  );
}

function AnalyticsPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-xl glass dark:border-white/10 dark:bg-white/10">
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-6 w-6 text-cyan-500" />
        <h3 className="text-2xl font-black">{title}</h3>
      </div>
      <div className="h-80">{children}</div>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/60">
      <h5 className="mb-2 font-black">{title}</h5>
      <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/60">
      <span className={`h-4 w-4 rounded-full ${className}`} />
      <span className="font-bold">{label}</span>
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900">
      <h4 className="font-black">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{text}</p>
      <button
        onClick={onClick}
        className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:scale-105 dark:bg-white dark:text-slate-950"
      >
        {action}
      </button>
    </div>
  );
}

function EmptyStateDark({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
      <h4 className="font-black">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-300">{text}</p>
      <button
        onClick={onClick}
        className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:scale-105"
      >
        {action}
      </button>
    </div>
  );
}
