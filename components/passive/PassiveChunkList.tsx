"use client";

import React from "react";
import type { Chunk, ChunkStatus } from "@/types";

interface Props {
  chunks: Chunk[];
  statuses: ChunkStatus[];
  flaggedIds: Set<string>;
  activeIndex: number;
  onChunkSelect: (index: number) => void;
  onToggleFlag: (chunkId: string) => void;
}

const STATUS_DOT: Record<ChunkStatus, string> = {
  unread: "bg-slate-300 dark:bg-slate-600",
  heard: "bg-blue-400 dark:bg-blue-500",
  read: "bg-green-500 dark:bg-green-400",
};

const STATUS_LABEL: Record<ChunkStatus, string> = {
  unread: "",
  heard: "H",
  read: "✓",
};

export function PassiveChunkList({
  chunks, statuses, flaggedIds, activeIndex, onChunkSelect, onToggleFlag,
}: Props) {
  const heardCount = statuses.filter((s) => s === "heard" || s === "read").length;
  const readCount = statuses.filter((s) => s === "read").length;

  return (
    <div className="w-64 h-full bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <ProgressHeader title={chunks[0]?.summary ?? "Document"} heardCount={heardCount} readCount={readCount} total={chunks.length} />
      <nav className="flex-1 overflow-y-auto p-2 pb-20">
        {chunks.map((chunk, i) => (
          <ChunkItem
            key={chunk.id}
            chunk={chunk}
            index={i}
            status={statuses[i] ?? "unread"}
            isFlagged={flaggedIds.has(chunk.id)}
            isActive={i === activeIndex}
            onSelect={() => onChunkSelect(i)}
            onToggleFlag={() => onToggleFlag(chunk.id)}
          />
        ))}
      </nav>
    </div>
  );
}

function ProgressHeader({ title, heardCount, readCount, total }: {
  title: string; heardCount: number; readCount: number; total: number;
}) {
  const heardPct = total > 0 ? (heardCount / total) * 100 : 0;
  const readPct = total > 0 ? (readCount / total) * 100 : 0;
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{title}</h2>
      <div className="space-y-1">
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
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5">
        <span>{label}</span><span>{count}/{total}</span>
      </div>
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChunkItem({ chunk, index, status, isFlagged, isActive, onSelect, onToggleFlag }: {
  chunk: Chunk; index: number; status: ChunkStatus;
  isFlagged: boolean; isActive: boolean;
  onSelect: () => void; onToggleFlag: () => void;
}) {
  return (
    <div className={`flex items-start gap-1 p-2 rounded-md mb-1 transition-colors ${
      isActive ? "bg-slate-900 dark:bg-slate-100" : "hover:bg-slate-100 dark:hover:bg-slate-700"
    }`}>
      <button onClick={onSelect} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
          <span className={`text-xs font-medium ${isActive ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>
            §{index + 1} {STATUS_LABEL[status] && <span className="ml-0.5">{STATUS_LABEL[status]}</span>}
          </span>
        </div>
        <p className={`text-xs leading-snug line-clamp-2 ${isActive ? "text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"}`}>
          {chunk.summary}
        </p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFlag(); }}
        title={isFlagged ? "Remove flag" : "Flag for review"}
        className={`shrink-0 text-sm p-0.5 rounded transition-colors ${
          isFlagged ? "text-amber-500" : isActive ? "text-slate-500" : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
        }`}
      >
        {isFlagged ? "🔖" : "⊹"}
      </button>
    </div>
  );
}
