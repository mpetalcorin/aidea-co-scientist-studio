export function buildHtmlReport(workspace: {
  question: string;
  hypotheses: any[];
  livePapers: any[];
  liveEvidence: any[];
  targetIntel: any[];
  targetGraph: any | null;
}) {
  const bestHypothesis = workspace.hypotheses?.[0];

  const targetBlocks = (workspace.targetIntel || [])
    .map(
      (item: any) => `
        <section class="card">
          <h3>${item.summary?.target || "Target"}</h3>
          <p>${item.summary?.description || ""}</p>
          <table>
            <tr><th>UniProt</th><td>${item.summary?.uniprot_available ? "Available" : "Not found"}</td></tr>
            <tr><th>ChEMBL targets</th><td>${item.summary?.chembl_targets_found || 0}</td></tr>
            <tr><th>ChEMBL compounds</th><td>${item.summary?.compounds_found || 0}</td></tr>
            <tr><th>Reactome pathways</th><td>${item.summary?.reactome_pathways_found || 0}</td></tr>
            <tr><th>Target intelligence score</th><td>${item.summary?.target_intelligence_score || 0}</td></tr>
          </table>
          <p class="links">
            ${item.uniprot?.url ? `<a href="${item.uniprot.url}">UniProt</a>` : ""}
            ${item.chembl?.targets?.[0]?.url ? `<a href="${item.chembl.targets[0].url}">ChEMBL</a>` : ""}
            ${item.reactome?.pathways?.[0]?.url ? `<a href="${item.reactome.pathways[0].url}">Reactome</a>` : ""}
          </p>
        </section>
      `
    )
    .join("");

  const hypothesisBlocks = (workspace.hypotheses || [])
    .map(
      (h: any) => `
        <section class="card">
          <h3>${h.id}: ${h.title}</h3>
          <p><strong>Rationale:</strong> ${h.rationale}</p>
          <p><strong>Critique:</strong> ${h.critique}</p>
          <p><strong>Improved testable version:</strong> ${h.improved}</p>
          <table>
            <tr><th>Novelty</th><td>${h.novelty}</td></tr>
            <tr><th>Plausibility</th><td>${h.plausibility}</td></tr>
            <tr><th>Feasibility</th><td>${h.feasibility}</td></tr>
            <tr><th>Translation</th><td>${h.translation}</td></tr>
            <tr><th>Evidence</th><td>${h.evidence}</td></tr>
            <tr><th>Risk</th><td>${h.risk}</td></tr>
          </table>
        </section>
      `
    )
    .join("");

  const paperBlocks = (workspace.livePapers || [])
    .slice(0, 12)
    .map(
      (paper: any) => `
        <section class="card small">
          <h3>${paper.title || "Untitled paper"}</h3>
          <p><strong>Journal:</strong> ${paper.journal || "Unknown"} ${paper.year ? `(${paper.year})` : ""}</p>
          <p><strong>PMID:</strong> ${paper.pmid || "N/A"}</p>
          <p>${paper.abstract || "No abstract retrieved."}</p>
          ${paper.url ? `<p><a href="${paper.url}">${paper.url}</a></p>` : ""}
        </section>
      `
    )
    .join("");

  const evidenceBlocks = (workspace.liveEvidence || [])
    .slice(0, 12)
    .map(
      (row: any) => `
        <section class="card small">
          <h3>${row.claim || "Evidence claim"}</h3>
          <p><strong>Source:</strong> ${row.source || "Unknown"}</p>
          <p><strong>Strength:</strong> ${row.strength || "Unrated"}</p>
          <p><strong>Limitation:</strong> ${row.limitation || "Requires expert review."}</p>
          ${row.url ? `<p><a href="${row.url}">${row.url}</a></p>` : ""}
        </section>
      `
    )
    .join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>aAidea Co-Scientist Report</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.6;
    }
    .page {
      max-width: 980px;
      margin: 0 auto;
      padding: 48px 28px;
    }
    .hero {
      background: linear-gradient(135deg, #111827, #312e81, #0e7490);
      color: white;
      padding: 42px;
      border-radius: 28px;
      margin-bottom: 28px;
    }
    .hero h1 {
      font-size: 42px;
      line-height: 1.05;
      margin: 0 0 14px;
    }
    .hero p {
      font-size: 17px;
      color: #dbeafe;
    }
    .section-title {
      font-size: 26px;
      margin: 34px 0 14px;
      color: #111827;
    }
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 22px;
      margin: 14px 0;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
    }
    .small h3 {
      font-size: 17px;
    }
    h2, h3 {
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      width: 220px;
      background: #f1f5f9;
    }
    a {
      color: #2563eb;
      word-break: break-word;
    }
    .summary-box {
      background: #eef2ff;
      border-left: 6px solid #4f46e5;
      padding: 22px;
      border-radius: 16px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      color: #64748b;
      font-size: 13px;
    }
    @media print {
      body {
        background: white;
      }
      .page {
        padding: 24px;
      }
      .card {
        box-shadow: none;
        break-inside: avoid;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>aAidea Co-Scientist Report</h1>
      <p>Evidence-grounded biomedical hypothesis generation, target intelligence, pathway mapping, compound retrieval, and experimental planning.</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <h2 class="section-title">Research Question</h2>
    <div class="summary-box">
      ${workspace.question || "No research question provided."}
    </div>

    <h2 class="section-title">Executive Summary</h2>
    <div class="card">
      <p>This report was generated from a multi-agent biomedical research workflow that combines hypothesis generation, evidence retrieval, target intelligence, pathway mapping, and translational prioritisation.</p>
      ${
        bestHypothesis
          ? `<p><strong>Top-ranked hypothesis:</strong> ${bestHypothesis.title}</p>
             <p><strong>Testable version:</strong> ${bestHypothesis.improved}</p>`
          : `<p>No top hypothesis available.</p>`
      }
    </div>

    <h2 class="section-title">Ranked Hypotheses</h2>
    ${hypothesisBlocks || "<p>No hypotheses available.</p>"}

    <h2 class="section-title">Target Intelligence, UniProt, ChEMBL, Reactome</h2>
    ${targetBlocks || "<p>No target intelligence available.</p>"}

    <h2 class="section-title">PubMed Evidence</h2>
    ${paperBlocks || "<p>No PubMed papers retrieved.</p>"}

    <h2 class="section-title">Evidence Audit</h2>
    ${evidenceBlocks || "<p>No evidence audit available.</p>"}

    <h2 class="section-title">Suggested Validation Plan</h2>
    <div class="card">
      <ol>
        <li>Select genetically defined cancer models with appropriate matched controls.</li>
        <li>Confirm baseline expression of nominated targets using qPCR, immunoblotting, proteomics, or public omics datasets.</li>
        <li>Measure metabolic state using lactate secretion, OCR, ECAR, ATP, NAD+/NADH, ROS, and nucleotide pools.</li>
        <li>Test single-agent and combination perturbations, including dose-response and time-course experiments.</li>
        <li>Measure DNA damage and replication stress using γH2AX, RAD51 foci, fork progression assays, cell-cycle profiling, and apoptosis markers.</li>
        <li>Use computational modelling and feature attribution to connect biomarkers to treatment response.</li>
        <li>Prioritise hypotheses with tumour-selective effects, coherent mechanism, and feasible translational path.</li>
      </ol>
    </div>

    <div class="footer">
      Generated by aAidea Co-Scientist Studio. Automated evidence retrieval requires expert review before use in grant applications, manuscripts, or clinical decision-making.
    </div>
  </div>
</body>
</html>
`;
}

export function openHtmlReport(workspace: {
  question: string;
  hypotheses: any[];
  livePapers: any[];
  liveEvidence: any[];
  targetIntel: any[];
  targetGraph: any | null;
}) {
  const html = buildHtmlReport(workspace);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function downloadHtmlReport(workspace: {
  question: string;
  hypotheses: any[];
  livePapers: any[];
  liveEvidence: any[];
  targetIntel: any[];
  targetGraph: any | null;
}) {
  const html = buildHtmlReport(workspace);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aidea-co-scientist-report.html";
  link.click();
  URL.revokeObjectURL(url);
}

export function buildGrantSummary(workspace: {
  question: string;
  hypotheses: any[];
  livePapers: any[];
  liveEvidence: any[];
  targetIntel: any[];
}) {
  const best = workspace.hypotheses?.[0];
  const targets = (workspace.targetIntel || [])
    .map((item: any) => item.summary?.target)
    .filter(Boolean)
    .join(", ");

  return `aAidea Co-Scientist Grant-Style Summary

Research question:
${workspace.question}

Central hypothesis:
${best?.title || "No central hypothesis selected."}

Scientific rationale:
${best?.rationale || "No rationale available."}

Improved testable hypothesis:
${best?.improved || "No improved hypothesis available."}

Key targets:
${targets || "No live targets retrieved."}

Evidence base:
The workflow retrieved ${workspace.livePapers?.length || 0} PubMed records, ${workspace.liveEvidence?.length || 0} evidence audit entries, and ${workspace.targetIntel?.length || 0} target intelligence profiles from UniProt, ChEMBL, and Reactome-linked sources.

Proposed validation strategy:
The project will use genetically defined cancer models, metabolic phenotyping, DNA damage assays, drug-response profiling, and computational biomarker modelling to evaluate whether the nominated target-pathway relationship produces a selective therapeutic vulnerability.

Translational significance:
The work aims to convert complex cancer biology into a ranked, evidence-grounded, experimentally testable discovery programme that can support grant writing, manuscript planning, and drug-repurposing prioritisation.`;
}
