import type { DocumentProgress, ChunkStatus } from "@/types";

const PROGRESS_KEY = "steep:progress";
const PASSIVE_FLAGS_KEY = "steep_passive_flags";
const PASSIVE_PROGRESS_KEY = "steep_passive_progress";

// ── Active reading progress ───────────────────────────────────────────────────

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
    if (status === "read" && chunk.status === "heard") chunk.status = "read";
    else if (status === "heard" && chunk.status !== "read") chunk.status = "heard";
    else if (status === "read") chunk.status = "read";
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

function readFlags(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(PASSIVE_FLAGS_KEY) ?? "{}"); }
  catch { return {}; }
}

export function getPassiveFlags(documentId: string): string[] {
  if (typeof window === "undefined") return [];
  return readFlags()[documentId] ?? [];
}

export function togglePassiveFlag(documentId: string, chunkId: string): string[] {
  if (typeof window === "undefined") return [];
  const all = readFlags();
  const flags: string[] = all[documentId] ?? [];
  const idx = flags.indexOf(chunkId);
  if (idx >= 0) flags.splice(idx, 1);
  else flags.push(chunkId);
  all[documentId] = flags;
  localStorage.setItem(PASSIVE_FLAGS_KEY, JSON.stringify(all));
  return [...flags];
}

// ── Passive mode: heard-status map ───────────────────────────────────────────

function readPassiveStatuses(): Record<string, Record<string, ChunkStatus>> {
  try { return JSON.parse(localStorage.getItem(PASSIVE_PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}

export function getPassiveStatuses(documentId: string): Record<string, ChunkStatus> {
  if (typeof window === "undefined") return {};
  return readPassiveStatuses()[documentId] ?? {};
}

export function savePassiveStatuses(
  documentId: string,
  statuses: Record<string, ChunkStatus>
): void {
  if (typeof window === "undefined") return;
  const all = readPassiveStatuses();
  all[documentId] = statuses;
  localStorage.setItem(PASSIVE_PROGRESS_KEY, JSON.stringify(all));
}

// ── Aliases used by PassiveReader ─────────────────────────────────────────────

export function savePassiveFlags(documentId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  const all = (() => { try { return JSON.parse(localStorage.getItem(PASSIVE_FLAGS_KEY) ?? "{}"); } catch { return {}; } })();
  all[documentId] = ids;
  localStorage.setItem(PASSIVE_FLAGS_KEY, JSON.stringify(all));
}

export { getPassiveStatuses as getPassiveProgress, savePassiveStatuses as savePassiveProgress };
