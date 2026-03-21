"use client";

import React from "react";
import type { ProcessedDocument, ChunkStatus } from "@/types";

interface Props {
  document: ProcessedDocument;
  chunkStatuses: ChunkStatus[];
  activeChunkIndex: number;
  onChunkSelect: (index: number) => void;
}

const STATUS_DOT: Record<ChunkStatus, string> = {
  unread: "bg-slate-300 dark:bg-slate-600",
  heard: "bg-blue-400 dark:bg-blue-500",
  read: "bg-green-500 dark:bg-green-400",
};

const STATUS_BADGE: Record<ChunkStatus, string> = {
  unread: "",
  heard: "H",
  read: "✓",
};

const STATUS_BADGE_STYLE: Record<ChunkStatus, string> = {
  unread: "",
  heard: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  read: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

export function DocumentSidebar({
  document,
  chunkStatuses,
  activeChunkIndex,
  onChunkSelect,
}: Props) {
  const total = chunkStatuses.length;
  const heardCount = chunkStatuses.filter((s) => s === "heard" || s === "read").length;
  const readCount = chunkStatuses.filter((s) => s === "read").length;

  return (
    <div className="w-64 h-full bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <SidebarHeader
        title={document.title}
        heardCount={heardCount}
        readCount={readCount}
        total={total}
      />
      <nav className="flex-1 overflow-y-auto p-2">
        {document.chunks.map((chunk, index) => {
          const status = chunkStatuses[index] ?? "unread";
          const isActive = index === activeChunkIndex;
          return (
            <button
              key={chunk.id}
              onClick={() => onChunkSelect(index)}
              className={`w-full text-left p-3 rounded-md mb-1 transition-colors ${
                isActive
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <ChunkRow chunk={chunk} index={index} status={status} isActive={isActive} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarHeader({ title, heardCount, readCount, total }: {
  title: string; heardCount: number; readCount: number; total: number;
}) {
  const heardPct = total > 0 ? (heardCount / total) * 100 : 0;
  const readPct = total > 0 ? (readCount / total) * 100 : 0;
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{title}</h2>
      <div className="space-y-1.5">
        <ProgressRow label="Heard" count={heardCount} total={total} pct={heardPct} color="bg-blue-400" />
        <ProgressRow label="Read" count={readCount} total={total} pct={readPct} color="bg-green-500" />
      </div>
    </div>
  );
}

function ProgressRow({ label, count, total, pct, color }: {
  label: string; count: number; total: number; pct: number; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-0.5">
        <span>{label}</span><span>{count}/{total}</span>
      </div>
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChunkRow({ chunk, index, status, isActive }: {
  chunk: { summary: string }; index: number; status: ChunkStatus; isActive: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {!isActive && <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />}
          <span className={`text-xs font-medium ${
            isActive ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"
          }`}>
            Section {index + 1}
          </span>
        </div>
        <p className="text-xs leading-snug line-clamp-2">{chunk.summary}</p>
      </div>
      {!isActive && STATUS_BADGE[status] && (
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full mt-0.5 font-medium ${STATUS_BADGE_STYLE[status]}`}>
          {STATUS_BADGE[status]}
        </span>
      )}
    </div>
  );
}
