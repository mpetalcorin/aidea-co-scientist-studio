export type SavedRun = {
  id: string;
  createdAt: string;
  question: string;
  hypotheses: any[];
  livePapers: any[];
  liveEvidence: any[];
  targetIntel: any[];
  targetGraph: any | null;
};

const STORAGE_KEY = "aidea-co-scientist-saved-runs";

export function getSavedRuns(): SavedRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRun(run: Omit<SavedRun, "id" | "createdAt">): SavedRun {
  const savedRuns = getSavedRuns();

  const newRun: SavedRun = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...run,
  };

  const nextRuns = [newRun, ...savedRuns].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRuns));

  return newRun;
}

export function deleteRun(id: string): SavedRun[] {
  const nextRuns = getSavedRuns().filter((run) => run.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRuns));
  return nextRuns;
}

export function clearRuns() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadRunJson(run: SavedRun) {
  const blob = new Blob([JSON.stringify(run, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aidea-co-scientist-run-${run.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
