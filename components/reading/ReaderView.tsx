"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ProcessedDocument, ChunkStatus, RawDocument } from "@/types";
import { DocumentSidebar } from "./DocumentSidebar";
import { ChunkReader } from "./ChunkReader";
import { initDocumentProgress, saveProgress, getProgress } from "@/lib/storage";
import { generateId } from "@/lib/utils";

interface Props {
  rawDocument: RawDocument;
  processedDocument: ProcessedDocument;
  onNewDocument: () => void;
  onOpenSettings?: () => void;
}

export function ReaderView({ rawDocument, processedDocument, onNewDocument, onOpenSettings }: Props) {
  const documentId = useDocumentId(rawDocument);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>(
    processedDocument.chunks.map(() => "unread")
  );

  useEffect(() => {
    const chunkIds = processedDocument.chunks.map((c) => c.id);
    const progress = initDocumentProgress(documentId, processedDocument.title, chunkIds);
    setActiveChunkIndex(progress.lastActiveChunkIndex);
    setChunkStatuses(progress.chunks.map((c) => c.status));
  }, [documentId, processedDocument]);

  const markChunkRead = useCallback(
    (index: number) => {
      setChunkStatuses((prev) => {
        const next = [...prev];
        next[index] = "read";
        return next;
      });
      const progress = getProgress(documentId);
      if (progress) {
        const chunk = progress.chunks[index];
        if (chunk) chunk.status = "read";
        const nextIndex = Math.min(index + 1, processedDocument.chunks.length - 1);
        progress.lastActiveChunkIndex = nextIndex;
        progress.savedAt = Date.now();
        saveProgress(progress);
        setActiveChunkIndex(nextIndex);
      }
    },
    [documentId, processedDocument.chunks.length]
  );

  const allConcepts = processedDocument.chunks.flatMap((c) => c.concepts);
  const activeChunk = processedDocument.chunks[activeChunkIndex];

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Steep</span>
        <div className="flex gap-3 items-center pr-9">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline"
            >
              AI Settings
            </button>
          )}
          <button
            onClick={onNewDocument}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline"
          >
            Load new document
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <DocumentSidebar
          document={processedDocument}
          chunkStatuses={chunkStatuses}
          activeChunkIndex={activeChunkIndex}
          onChunkSelect={setActiveChunkIndex}
        />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          <div className="max-w-2xl mx-auto py-10 px-8">
            {activeChunk && (
              <ChunkReader
                key={activeChunk.id}
                chunk={activeChunk}
                allConcepts={allConcepts}
                onComplete={() => markChunkRead(activeChunkIndex)}
                isLast={activeChunkIndex === processedDocument.chunks.length - 1}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function useDocumentId(raw: RawDocument): string {
  const [id] = useState(() => {
    const key = `steep:docid:${raw.text.substring(0, 200)}`;
    const cached = sessionStorage.getItem(key);
    if (cached) return cached;
    const newId = generateId();
    sessionStorage.setItem(key, newId);
    return newId;
  });
  return id;
}
