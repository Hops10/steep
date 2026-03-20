"use client";

import React from "react";
import type { ProcessedDocument, ChunkStatus } from "@/types";

interface Props {
  document: ProcessedDocument;
  chunkStatuses: ChunkStatus[];
  activeChunkIndex: number;
  onChunkSelect: (index: number) => void;
}

const STATUS_STYLES: Record<ChunkStatus, string> = {
  unread: "bg-slate-200 text-slate-500",
  heard: "bg-blue-100 text-blue-700",   // Sprint 2: passive/TTS mode
  read: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<ChunkStatus, string> = {
  unread: "Unread",
  heard: "Heard",   // Sprint 2 only
  read: "Read",
};

export function DocumentSidebar({
  document,
  chunkStatuses,
  activeChunkIndex,
  onChunkSelect,
}: Props) {
  const readCount = chunkStatuses.filter((s) => s === "read").length;
  const total = chunkStatuses.length;

  return (
    <div className="w-64 h-full bg-slate-50 border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900 text-sm truncate">
          {document.title}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {readCount} / {total} sections read
        </p>
        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(readCount / total) * 100}%` }}
          />
        </div>
      </div>

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
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium mb-1 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                    Section {index + 1}
                  </p>
                  <p className="text-xs leading-snug line-clamp-2">{chunk.summary}</p>
                </div>
                {!isActive && (
                  <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
