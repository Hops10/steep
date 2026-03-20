import type { DocumentProgress, ChunkProgress, ChunkStatus } from "@/types";

const PROGRESS_KEY = "steep:progress";
const DOCUMENTS_KEY = "steep:documents";

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
