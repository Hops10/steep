"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ProcessedDocument, ChunkStatus, RawDocument, VoiceConfig } from "@/types";
import { DEFAULT_VOICE_CONFIG, VOICE_CONFIG_KEY } from "@/types";
import { DocumentSidebar } from "./DocumentSidebar";
import { ChunkReader } from "./ChunkReader";
import { ModeSelector } from "./ModeSelector";
import { SynthesisPrompt } from "./SynthesisPrompt";
import { PassiveReader } from "@/components/passive/PassiveReader";
import { initDocumentProgress, saveProgress, getProgress } from "@/lib/storage";
import { generateId } from "@/lib/utils";

type ReaderMode = "select" | "passive" | "active";

interface Props {
  rawDocument: RawDocument;
  processedDocument: ProcessedDocument;
  onNewDocument: () => void;
  onOpenSettings?: () => void;
}

export function ReaderView({ rawDocument, processedDocument, onNewDocument, onOpenSettings }: Props) {
  const documentId = useDocumentId(rawDocument);
  const [mode, setMode] = useState<ReaderMode>("select");
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>(
    processedDocument.chunks.map(() => "unread")
  );
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG);

  useEffect(() => {
    const chunkIds = processedDocument.chunks.map((c) => c.id);
    const progress = initDocumentProgress(documentId, processedDocument.title, chunkIds);
    setActiveChunkIndex(progress.lastActiveChunkIndex);
    setChunkStatuses(progress.chunks.map((c) => c.status));
    try {
      const raw = localStorage.getItem(VOICE_CONFIG_KEY);
      if (raw) setVoiceConfig(JSON.parse(raw) as VoiceConfig);
    } catch { /* use default */ }
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

  const handleSwitchToActive = useCallback((startIndex: number, _flaggedIds: string[]) => {
    setActiveChunkIndex(startIndex);
    setMode("active");
  }, []);

  const allConcepts = processedDocument.chunks.flatMap((c) => c.concepts);
  const allRead = chunkStatuses.length > 0 && chunkStatuses.every((s) => s === "read");

  if (mode === "select") {
    return (
      <ModeSelector
        title={processedDocument.title}
        onSelectPassive={() => setMode("passive")}
        onSelectActive={() => setMode("active")}
      />
    );
  }

  if (mode === "passive") {
    return (
      <PassiveReader
        rawDocument={rawDocument}
        processedDocument={processedDocument}
        voiceConfig={voiceConfig}
        onNewDocument={onNewDocument}
        onOpenSettings={onOpenSettings}
        onSwitchToActive={handleSwitchToActive}
      />
    );
  }

  // Active mode
  const activeChunk = processedDocument.chunks[activeChunkIndex];
  return (
    <div className="h-screen flex flex-col">
      <ActiveHeader onNewDocument={onNewDocument} onOpenSettings={onOpenSettings} onSwitchPassive={() => setMode("passive")} />
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
            {allRead && (
              <SynthesisPrompt
                documentTitle={processedDocument.title}
                chunkSummaries={processedDocument.chunks.map((c) => c.summary)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ActiveHeader({ onNewDocument, onOpenSettings, onSwitchPassive }: {
  onNewDocument: () => void;
  onOpenSettings?: () => void;
  onSwitchPassive: () => void;
}) {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Steep</span>
      <div className="flex gap-3 items-center pr-9">
        <button onClick={onSwitchPassive} className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 underline">
          🎧 Listen
        </button>
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline">
            AI Settings
          </button>
        )}
        <button onClick={onNewDocument} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline">
          Load new document
        </button>
      </div>
    </header>
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
