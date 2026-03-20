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
  unread: "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
  heard: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  read: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

const STATUS_LABELS: Record<ChunkStatus, string> = {
  unread: "Unread",
  heard: "Heard",
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
    <div className="w-64 h-full bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
          {document.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {readCount} / {total} sections read
        </p>
        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium mb-1 ${
                    isActive
                      ? "text-slate-300 dark:text-slate-600"
                      : "text-slate-400 dark:text-slate-500"
                  }`}>
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
