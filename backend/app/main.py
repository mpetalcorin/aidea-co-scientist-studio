from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional


app = FastAPI(
    title="aAidea Co-Scientist API",
    description="Evidence-grounded biomedical hypothesis generation backend with PubMed, ChEMBL, UniProt, and Reactome.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchQuestion(BaseModel):
    question: str


class TargetRequest(BaseModel):
    target: str


class MultiTargetRequest(BaseModel):
    targets: List[str]


class Hypothesis(BaseModel):
    id: str
    title: str
    rationale: str
    critique: str
    improved: str
    novelty: int
    plausibility: int
    feasibility: int
    translation: int
    evidence: int
    risk: int


TARGET_ALIASES = {
    "LDHA": {
        "uniprot": "P00338",
        "chembl_query": "LDHA",
        "reactome_query": "lactate dehydrogenase",
        "description": "Lactate dehydrogenase A, glycolysis, lactate production, NAD+ regeneration",
    },
    "MCT4": {
        "uniprot": "O15427",
        "chembl_query": "SLC16A3",
        "reactome_query": "lactate transport",
        "description": "Monocarboxylate transporter 4, lactate export, acidic tumour microenvironment",
    },
    "SLC16A3": {
        "uniprot": "O15427",
        "chembl_query": "SLC16A3",
        "reactome_query": "lactate transport",
        "description": "Monocarboxylate transporter 4, lactate export, acidic tumour microenvironment",
    },
    "BRCA2": {
        "uniprot": "P51587",
        "chembl_query": "BRCA2",
        "reactome_query": "homologous recombination repair",
        "description": "Homologous recombination repair, RAD51 loading, genome stability",
    },
    "RAD51": {
        "uniprot": "Q06609",
        "chembl_query": "RAD51",
        "reactome_query": "homologous recombination repair",
        "description": "DNA strand exchange, homologous recombination, replication fork repair",
    },
    "POLQ": {
        "uniprot": "O75417",
        "chembl_query": "POLQ",
        "reactome_query": "DNA double strand break repair",
        "description": "DNA polymerase theta, alternative end-joining, synthetic lethality",
    },
    "ATR": {
        "uniprot": "Q13535",
        "chembl_query": "ATR",
        "reactome_query": "ATR signaling",
        "description": "Replication stress checkpoint kinase, DNA damage response",
    },
    "GLS": {
        "uniprot": "O94925",
        "chembl_query": "GLS",
        "reactome_query": "glutamine metabolism",
        "description": "Glutaminase, glutamine metabolism, anaplerosis, redox buffering",
    },
    "HK2": {
        "uniprot": "P52789",
        "chembl_query": "HK2",
        "reactome_query": "glycolysis",
        "description": "Hexokinase 2, glucose phosphorylation, glycolytic commitment",
    },
    "PKM2": {
        "uniprot": "P14618",
        "chembl_query": "PKM",
        "reactome_query": "glycolysis",
        "description": "Pyruvate kinase M2, glycolysis, cancer metabolic regulation",
    },
}


def safe_get_json(url: str, params: Optional[Dict[str, Any]] = None, timeout: int = 25) -> Any:
    try:
        response = requests.get(
            url,
            params=params,
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        return {"error": str(exc), "url": url, "params": params or {}}


def pubmed_search(query: str, max_results: int = 8) -> List[Dict[str, Any]]:
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"

    search_params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": max_results,
        "sort": "relevance",
    }

    try:
        search_response = requests.get(search_url, params=search_params, timeout=20)
        search_response.raise_for_status()
        ids = search_response.json().get("esearchresult", {}).get("idlist", [])

        if not ids:
            return []

        fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

        fetch_params = {
            "db": "pubmed",
            "id": ",".join(ids),
            "retmode": "xml",
        }

        fetch_response = requests.get(fetch_url, params=fetch_params, timeout=20)
        fetch_response.raise_for_status()

        root = ET.fromstring(fetch_response.text)
        papers = []

        for article in root.findall(".//PubmedArticle"):
            pmid = article.findtext(".//PMID") or ""
            title = article.findtext(".//ArticleTitle") or "Untitled article"
            journal = article.findtext(".//Journal/Title") or "Unknown journal"
            year = article.findtext(".//PubDate/Year") or "Unknown year"

            abstract_parts = []
            for node in article.findall(".//AbstractText"):
                if node.text:
                    abstract_parts.append(node.text)

            papers.append(
                {
                    "pmid": pmid,
                    "title": title,
                    "journal": journal,
                    "year": year,
                    "abstract": " ".join(abstract_parts)[:1200],
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "",
                }
            )

        return papers

    except Exception as exc:
        return [
            {
                "pmid": "",
                "title": "PubMed retrieval failed",
                "journal": "Backend message",
                "year": "",
                "abstract": str(exc),
                "url": "",
            }
        ]


def get_target_info(target: str) -> Dict[str, Any]:
    key = target.upper().strip()
    alias = TARGET_ALIASES.get(
        key,
        {
            "uniprot": "",
            "chembl_query": key,
            "reactome_query": key,
            "description": "User-provided biomedical target",
        },
    )

    return {
        "symbol": key,
        "uniprot_id": alias["uniprot"],
        "chembl_query": alias["chembl_query"],
        "reactome_query": alias["reactome_query"],
        "description": alias["description"],
    }


def uniprot_lookup(target: str) -> Dict[str, Any]:
    info = get_target_info(target)
    accession = info["uniprot_id"]

    if accession:
        url = f"https://rest.uniprot.org/uniprotkb/{accession}.json"
        data = safe_get_json(url)

        if "error" not in data:
            protein_name = (
                data.get("proteinDescription", {})
                .get("recommendedName", {})
                .get("fullName", {})
                .get("value", "")
            )

            gene_names = []
            for gene in data.get("genes", []):
                if "geneName" in gene:
                    gene_names.append(gene["geneName"].get("value", ""))

            comments = []
            for comment in data.get("comments", []):
                if comment.get("commentType") == "FUNCTION":
                    for text in comment.get("texts", []):
                        if text.get("value"):
                            comments.append(text["value"])

            return {
                "target": target.upper(),
                "accession": accession,
                "protein_name": protein_name,
                "gene_names": gene_names,
                "organism": data.get("organism", {}).get("scientificName", ""),
                "function": " ".join(comments)[:1200],
                "url": f"https://www.uniprot.org/uniprotkb/{accession}/entry",
            }

    query_url = "https://rest.uniprot.org/uniprotkb/search"
    params = {
        "query": f"gene_exact:{target.upper()} AND organism_id:9606",
        "format": "json",
        "size": 1,
    }
    data = safe_get_json(query_url, params=params)

    results = data.get("results", []) if isinstance(data, dict) else []

    if not results:
        return {
            "target": target.upper(),
            "accession": "",
            "protein_name": "",
            "gene_names": [],
            "organism": "",
            "function": "",
            "url": "",
            "message": "No UniProt result found.",
        }

    item = results[0]
    accession = item.get("primaryAccession", "")
    protein_name = (
        item.get("proteinDescription", {})
        .get("recommendedName", {})
        .get("fullName", {})
        .get("value", "")
    )

    return {
        "target": target.upper(),
        "accession": accession,
        "protein_name": protein_name,
        "gene_names": [target.upper()],
        "organism": item.get("organism", {}).get("scientificName", ""),
        "function": "",
        "url": f"https://www.uniprot.org/uniprotkb/{accession}/entry" if accession else "",
    }


def chembl_target_search(target: str) -> Dict[str, Any]:
    info = get_target_info(target)
    query = info["chembl_query"]

    url = "https://www.ebi.ac.uk/chembl/api/data/target/search.json"
    data = safe_get_json(url, params={"q": query})

    targets = []

    for item in data.get("targets", [])[:5] if isinstance(data, dict) else []:
        targets.append(
            {
                "chembl_id": item.get("target_chembl_id", ""),
                "pref_name": item.get("pref_name", ""),
                "organism": item.get("organism", ""),
                "target_type": item.get("target_type", ""),
                "score": item.get("score", ""),
                "url": f"https://www.ebi.ac.uk/chembl/target_report_card/{item.get('target_chembl_id', '')}/",
            }
        )

    return {
        "target": target.upper(),
        "query": query,
        "targets": targets,
    }


def chembl_compounds_for_target(target_chembl_id: str, limit: int = 12) -> List[Dict[str, Any]]:
    if not target_chembl_id:
        return []

    url = "https://www.ebi.ac.uk/chembl/api/data/activity.json"
    params = {
        "target_chembl_id": target_chembl_id,
        "standard_type__in": "IC50,Ki,Kd,EC50",
        "limit": limit,
    }

    data = safe_get_json(url, params=params)

    compounds = []

    for item in data.get("activities", []) if isinstance(data, dict) else []:
        molecule_id = item.get("molecule_chembl_id", "")
        compounds.append(
            {
                "molecule_chembl_id": molecule_id,
                "standard_type": item.get("standard_type", ""),
                "standard_value": item.get("standard_value", ""),
                "standard_units": item.get("standard_units", ""),
                "pchembl_value": item.get("pchembl_value", ""),
                "assay_description": item.get("assay_description", ""),
                "url": f"https://www.ebi.ac.uk/chembl/compound_report_card/{molecule_id}/" if molecule_id else "",
            }
        )

    return compounds[:limit]


def reactome_search(target: str) -> Dict[str, Any]:
    info = get_target_info(target)
    query = info["reactome_query"]

    url = "https://reactome.org/ContentService/search/query"
    params = {
        "query": query,
        "species": "Homo sapiens",
        "types": "Pathway",
        "cluster": "true",
    }

    data = safe_get_json(url, params=params)

    pathways = []

    if isinstance(data, dict):
        results = data.get("results", [])
        for result in results[:8]:
            pathways.append(
                {
                    "st_id": result.get("stId", ""),
                    "name": result.get("name", ""),
                    "type": result.get("type", ""),
                    "species": result.get("speciesName", ""),
                    "url": f"https://reactome.org/content/detail/{result.get('stId', '')}" if result.get("stId") else "",
                }
            )

    return {
        "target": target.upper(),
        "query": query,
        "pathways": pathways,
    }


def target_intelligence(target: str) -> Dict[str, Any]:
    target_info = get_target_info(target)
    uniprot = uniprot_lookup(target)
    chembl_targets = chembl_target_search(target)
    first_chembl_id = ""

    if chembl_targets.get("targets"):
        first_chembl_id = chembl_targets["targets"][0].get("chembl_id", "")

    compounds = chembl_compounds_for_target(first_chembl_id, limit=10)
    reactome = reactome_search(target)

    evidence_score = 45
    if uniprot.get("accession"):
        evidence_score += 15
    if chembl_targets.get("targets"):
        evidence_score += 15
    if compounds:
        evidence_score += 15
    if reactome.get("pathways"):
        evidence_score += 10

    evidence_score = min(evidence_score, 100)

    return {
        "target_info": target_info,
        "uniprot": uniprot,
        "chembl": chembl_targets,
        "compounds": compounds,
        "reactome": reactome,
        "summary": {
            "target": target.upper(),
            "description": target_info["description"],
            "uniprot_available": bool(uniprot.get("accession")),
            "chembl_targets_found": len(chembl_targets.get("targets", [])),
            "compounds_found": len(compounds),
            "reactome_pathways_found": len(reactome.get("pathways", [])),
            "target_intelligence_score": evidence_score,
        },
    }


@app.get("/")
def root():
    return {
        "message": "aAidea Co-Scientist API is running.",
        "version": "0.2.0",
        "endpoints": [
            "/api/pubmed-search",
            "/api/generate-hypotheses",
            "/api/evidence-matrix",
            "/api/rank-hypotheses",
            "/api/uniprot/{target}",
            "/api/chembl/{target}",
            "/api/reactome/{target}",
            "/api/target-intelligence/{target}",
            "/api/multi-target-intelligence",
        ],
    }


@app.post("/api/pubmed-search")
def search_pubmed(payload: ResearchQuestion):
    papers = pubmed_search(payload.question)
    return {
        "question": payload.question,
        "papers": papers,
    }


@app.get("/api/uniprot/{target}")
def api_uniprot(target: str):
    return uniprot_lookup(target)


@app.get("/api/chembl/{target}")
def api_chembl(target: str):
    target_results = chembl_target_search(target)
    first_chembl_id = ""

    if target_results.get("targets"):
        first_chembl_id = target_results["targets"][0].get("chembl_id", "")

    compounds = chembl_compounds_for_target(first_chembl_id, limit=10)

    return {
        "target": target.upper(),
        "target_results": target_results,
        "selected_chembl_target_id": first_chembl_id,
        "compounds": compounds,
    }


@app.get("/api/reactome/{target}")
def api_reactome(target: str):
    return reactome_search(target)


@app.get("/api/target-intelligence/{target}")
def api_target_intelligence(target: str):
    return target_intelligence(target)


@app.post("/api/multi-target-intelligence")
def api_multi_target_intelligence(payload: MultiTargetRequest):
    results = [target_intelligence(target) for target in payload.targets]

    graph_nodes = []
    graph_edges = []

    for item in results:
        symbol = item["summary"]["target"]

        graph_nodes.append(
            {
                "id": symbol,
                "label": symbol,
                "type": "target",
                "score": item["summary"]["target_intelligence_score"],
            }
        )

        for pathway in item["reactome"].get("pathways", [])[:3]:
            pathway_id = pathway.get("st_id") or pathway.get("name")
            if pathway_id:
                graph_nodes.append(
                    {
                        "id": pathway_id,
                        "label": pathway.get("name", pathway_id),
                        "type": "pathway",
                        "score": 70,
                    }
                )
                graph_edges.append(
                    {
                        "source": symbol,
                        "target": pathway_id,
                        "type": "participates_in",
                    }
                )

        for compound in item.get("compounds", [])[:3]:
            mol_id = compound.get("molecule_chembl_id")
            if mol_id:
                graph_nodes.append(
                    {
                        "id": mol_id,
                        "label": mol_id,
                        "type": "compound",
                        "score": 65,
                    }
                )
                graph_edges.append(
                    {
                        "source": mol_id,
                        "target": symbol,
                        "type": "bioactivity_against",
                    }
                )

    unique_nodes = {}
    for node in graph_nodes:
        unique_nodes[node["id"]] = node

    return {
        "targets": payload.targets,
        "results": results,
        "graph": {
            "nodes": list(unique_nodes.values()),
            "edges": graph_edges,
        },
    }


@app.post("/api/generate-hypotheses")
def generate_hypotheses(payload: ResearchQuestion):
    question = payload.question

    papers = pubmed_search(question, max_results=6)

    detected_targets = []
    upper_question = question.upper()

    for symbol in TARGET_ALIASES:
        if symbol in upper_question and symbol not in detected_targets:
            detected_targets.append(symbol)

    if not detected_targets:
        detected_targets = ["LDHA", "BRCA2", "ATR", "GLS"]

    target_layer = [target_intelligence(t) for t in detected_targets[:4]]

    hypotheses = [
        {
            "id": "H1",
            "title": "Metabolic stress may amplify DNA repair vulnerability in tumour cells.",
            "rationale": "The research question links metabolic adaptation with DNA repair stress. A plausible testable hypothesis is that blocking a compensatory metabolic pathway may reduce the ability of tumour cells to tolerate replication stress or DNA damage.",
            "critique": "This hypothesis is broad and requires careful tumour-type selection, matched normal controls, and confirmation that the metabolic dependency is causal rather than correlative.",
            "improved": "Use genetically defined tumour models and test whether inhibition of the nominated metabolic pathway increases DNA damage, replication stress, and loss of viability compared with matched repair-proficient controls.",
            "novelty": 78,
            "plausibility": 84,
            "feasibility": 86,
            "translation": 76,
            "evidence": 72,
            "risk": 48,
        },
        {
            "id": "H2",
            "title": "A combined biomarker signature may identify tumours most likely to respond.",
            "rationale": "Single biomarkers often fail because tumour biology is adaptive. A combined signature including repair state, metabolic markers, stress markers, and drug response data may improve patient stratification.",
            "critique": "The hypothesis depends on access to high-quality transcriptomic, proteomic, metabolic, and pharmacological datasets.",
            "improved": "Build a biomarker model using TCGA, CCLE, DepMap, GDSC, and PRISM, then validate predicted vulnerabilities in selected cell models.",
            "novelty": 82,
            "plausibility": 87,
            "feasibility": 80,
            "translation": 83,
            "evidence": 74,
            "risk": 42,
        },
        {
            "id": "H3",
            "title": "Drug repurposing may uncover clinically tractable combinations.",
            "rationale": "If the target pathway has existing inhibitors or indirect modulators, repurposed agents may accelerate translational testing.",
            "critique": "Repurposed drugs may have insufficient potency, poor tumour exposure, or unacceptable combination toxicity.",
            "improved": "Prioritise compounds using ChEMBL target activity, clinical status, safety profile, pathway relevance, and evidence from cancer models.",
            "novelty": 74,
            "plausibility": 82,
            "feasibility": 88,
            "translation": 86,
            "evidence": 70,
            "risk": 45,
        },
    ]

    return {
        "question": question,
        "detected_targets": detected_targets,
        "papers_used": papers,
        "target_intelligence": target_layer,
        "hypotheses": hypotheses,
    }


@app.post("/api/evidence-matrix")
def evidence_matrix(payload: ResearchQuestion):
    papers = pubmed_search(payload.question, max_results=8)

    rows = []

    for paper in papers:
        rows.append(
            {
                "claim": f"Relevant literature evidence identified: {paper['title']}",
                "source": f"{paper['journal']} ({paper['year']})",
                "strength": "Moderate",
                "limitation": "Automated retrieval, requires expert review before use in a manuscript or grant.",
                "url": paper["url"],
            }
        )

    return {
        "question": payload.question,
        "evidence": rows,
    }


@app.post("/api/rank-hypotheses")
def rank_hypotheses(payload: ResearchQuestion):
    generated = generate_hypotheses(payload)
    hypotheses = generated["hypotheses"]

    ranked = []

    for h in hypotheses:
        score = round(
            (
                h["novelty"]
                + h["plausibility"]
                + h["feasibility"]
                + h["translation"]
                + h["evidence"]
                - h["risk"] * 0.35
            )
            / 4.65
        )
        ranked.append({**h, "overall_score": score})

    ranked.sort(key=lambda x: x["overall_score"], reverse=True)

    return {
        "question": payload.question,
        "ranked_hypotheses": ranked,
    }

from fastapi.responses import StreamingResponse
from app.reporting import make_docx_report, make_pdf_report


@app.post("/api/report/docx")
def api_report_docx(workspace: Dict[str, Any]):
    buffer = make_docx_report(workspace)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": "attachment; filename=aidea-co-scientist-report.docx"
        },
    )


@app.post("/api/report/pdf")
def api_report_pdf(workspace: Dict[str, Any]):
    buffer = make_pdf_report(workspace)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=aidea-co-scientist-report.pdf"
        },
    )
