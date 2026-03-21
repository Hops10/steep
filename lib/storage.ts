import type { DocumentProgress, ChunkProgress, ChunkStatus } from "@/types";

const PROGRESS_KEY = "steep:progress";
const DOCUMENTS_KEY = "steep:documents";
const PASSIVE_FLAGS_KEY = "steep_passive_flags";
const PASSIVE_PROGRESS_KEY = "steep_passive_progress";

export function saveProgress(progress: DocumentProgress): void {
  if (typeof window === "undefined") return;
  const all = getAllProgress();
  all[progress.documentId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export function getProgress(documentId: string): DocumentProgress | null {
  if (typeof window === "undefined") return null;
  const all = getAllProgress();
  return all[documentId] ?? null;
}

export function getAllProgress(): Record<string, DocumentProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function updateChunkStatus(
  documentId: string,
  chunkId: string,
  status: ChunkStatus
): void {
  const progress = getProgress(documentId);
  if (!progress) return;
  const chunk = progress.chunks.find((c) => c.chunkId === chunkId);
  if (chunk) {
    // Never conflate "heard" and "read"
    if (status === "read" && chunk.status === "heard") {
      chunk.status = "read";
    } else if (status === "heard" && chunk.status !== "read") {
      chunk.status = "heard";
    } else if (status === "read") {
      chunk.status = "read";
    }
    progress.savedAt = Date.now();
    saveProgress(progress);
  }
}

export function initDocumentProgress(
  documentId: string,
  title: string,
  chunkIds: string[]
): DocumentProgress {
  const existing = getProgress(documentId);
  if (existing) return existing;

  const progress: DocumentProgress = {
    documentId,
    title,
    chunks: chunkIds.map((id) => ({ chunkId: id, status: "unread" })),
    lastActiveChunkIndex: 0,
    savedAt: Date.now(),
  };
  saveProgress(progress);
  return progress;
}

// ── Passive mode: flags ───────────────────────────────────────────────────────

export function getPassiveFlags(documentId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(PASSIVE_FLAGS_KEY) ?? "{}");
    return all[documentId] ?? [];
  } catch {
    return [];
  }
}

export function savePassiveFlags(documentId: string, flaggedIds: string[]): void {
  if (typeof window === "undefined") return;
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(PASSIVE_FLAGS_KEY) ?? "{}"); }
    catch { return {}; }
  })();
  all[documentId] = flaggedIds;
  localStorage.setItem(PASSIVE_FLAGS_KEY, JSON.stringify(all));
}

// ── Passive mode: per-chunk heard/unread status ───────────────────────────────

export function getPassiveProgress(documentId: string): Record<string, ChunkStatus> {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(localStorage.getItem(PASSIVE_PROGRESS_KEY) ?? "{}");
    return all[documentId] ?? {};
  } catch {
    return {};
  }
}

export function savePassiveProgress(
  documentId: string,
  statuses: Record<string, ChunkStatus>
): void {
  if (typeof window === "undefined") return;
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(PASSIVE_PROGRESS_KEY) ?? "{}"); }
    catch { return {}; }
  })();
  all[documentId] = statuses;
  localStorage.setItem(PASSIVE_PROGRESS_KEY, JSON.stringify(all));
}
