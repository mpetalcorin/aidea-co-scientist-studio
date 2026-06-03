export type ApiHypothesis = {
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

export type PubMedPaper = {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  abstract: string;
  url: string;
};

export type TargetIntelligence = {
  target_info: {
    symbol: string;
    uniprot_id: string;
    chembl_query: string;
    reactome_query: string;
    description: string;
  };
  uniprot: {
    target: string;
    accession: string;
    protein_name: string;
    gene_names: string[];
    organism: string;
    function: string;
    url: string;
  };
  chembl: {
    target: string;
    query: string;
    targets: Array<{
      chembl_id: string;
      pref_name: string;
      organism: string;
      target_type: string;
      score: string;
      url: string;
    }>;
  };
  compounds: Array<{
    molecule_chembl_id: string;
    standard_type: string;
    standard_value: string;
    standard_units: string;
    pchembl_value: string;
    assay_description: string;
    url: string;
  }>;
  reactome: {
    target: string;
    query: string;
    pathways: Array<{
      st_id: string;
      name: string;
      type: string;
      species: string;
      url: string;
    }>;
  };
  summary: {
    target: string;
    description: string;
    uniprot_available: boolean;
    chembl_targets_found: number;
    compounds_found: number;
    reactome_pathways_found: number;
    target_intelligence_score: number;
  };
};

export type MultiTargetIntelligence = {
  targets: string[];
  results: TargetIntelligence[];
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      score: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
};

const API_BASE = "http://localhost:8000";

export async function generateHypotheses(question: string): Promise<{
  question: string;
  detected_targets?: string[];
  papers_used: PubMedPaper[];
  target_intelligence?: TargetIntelligence[];
  hypotheses: ApiHypothesis[];
}> {
  const response = await fetch(`${API_BASE}/api/generate-hypotheses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate hypotheses.");
  }

  return response.json();
}

export async function getEvidenceMatrix(question: string): Promise<{
  question: string;
  evidence: Array<{
    claim: string;
    source: string;
    strength: string;
    limitation: string;
    url: string;
  }>;
}> {
  const response = await fetch(`${API_BASE}/api/evidence-matrix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve evidence matrix.");
  }

  return response.json();
}

export async function getTargetIntelligence(
  target: string
): Promise<TargetIntelligence> {
  const response = await fetch(`${API_BASE}/api/target-intelligence/${target}`);

  if (!response.ok) {
    throw new Error("Failed to retrieve target intelligence.");
  }

  return response.json();
}

export async function getMultiTargetIntelligence(
  targets: string[]
): Promise<MultiTargetIntelligence> {
  const response = await fetch(`${API_BASE}/api/multi-target-intelligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targets }),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve multi-target intelligence.");
  }

  return response.json();
}

export async function downloadBackendReport(
  workspace: {
    question: string;
    hypotheses: any[];
    livePapers: any[];
    liveEvidence: any[];
    targetIntel: any[];
    targetGraph: any | null;
  },
  format: "docx" | "pdf"
) {
  const response = await fetch(`${API_BASE}/api/report/${format}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workspace),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate ${format.toUpperCase()} report.`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    format === "docx"
      ? "aidea-co-scientist-report.docx"
      : "aidea-co-scientist-report.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
