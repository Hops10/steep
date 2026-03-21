"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProcessedDocument, ChunkStatus, RawDocument, VoiceConfig } from "@/types";
import { AudioToolbar, type Speed } from "./AudioToolbar";
import { PassiveChunkList } from "./PassiveChunkList";
import { usePassiveAudio } from "./usePassiveAudio";
import { getPassiveFlags, savePassiveFlags, getPassiveProgress, savePassiveProgress } from "@/lib/storage";
import { generateId } from "@/lib/utils";

interface Props {
  rawDocument: RawDocument;
  processedDocument: ProcessedDocument;
  voiceConfig: VoiceConfig;
  onNewDocument: () => void;
  onOpenSettings?: () => void;
  onSwitchToActive: (startIndex: number, flaggedIds: string[]) => void;
}

export function PassiveReader({
  rawDocument, processedDocument, voiceConfig,
  onNewDocument, onOpenSettings, onSwitchToActive,
}: Props) {
  const documentId = useDocumentId(rawDocument);
  const [activeIndex, setActiveIndex] = useState(0);
  const [statuses, setStatuses] = useState<ChunkStatus[]>(() => processedDocument.chunks.map(() => "unread"));
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [speed, setSpeed] = useState<Speed>(1);
  const [showEndPanel, setShowEndPanel] = useState(false);
  const [recommendations, setRecommendations] = useState<{ chunkId: string; reason: string }[]>([]);

  useEffect(() => {
    setFlaggedIds(new Set(getPassiveFlags(documentId)));
    const progress = getPassiveProgress(documentId);
    setStatuses(processedDocument.chunks.map((c) => progress[c.id] ?? "unread"));
  }, [documentId, processedDocument]);

  const markHeard = useCallback((index: number) => {
    const chunkId = processedDocument.chunks[index]?.id;
    if (!chunkId) return;
    setStatuses((prev) => { const n = [...prev]; if (n[index] !== "read") n[index] = "heard"; return n; });
    const progress = getPassiveProgress(documentId);
    if (progress[chunkId] !== "read") progress[chunkId] = "heard";
    savePassiveProgress(documentId, progress);
  }, [documentId, processedDocument]);

  const handleChunkEnded = useCallback((index: number) => {
    markHeard(index);
    const nextIndex = index + 1;
    if (nextIndex < processedDocument.chunks.length) {
      setActiveIndex(nextIndex);
      // auto-play next chunk via play() below is triggered by activeIndex change
      void audio.play(processedDocument.chunks[nextIndex].text, nextIndex);
    } else {
      setShowEndPanel(true);
      audio.setAudioState("done");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markHeard, processedDocument]);

  const audio = usePassiveAudio({ speed, voiceConfig, onChunkEnded: handleChunkEnded });

  const handlePlay = useCallback(() => {
    if (audio.audioState === "paused") { audio.resume(); return; }
    void audio.play(processedDocument.chunks[activeIndex]?.text ?? "", activeIndex);
  }, [audio, activeIndex, processedDocument]);

  const handleRestart = useCallback(() => {
    audio.stop();
    audio.setAudioState("idle");
    setShowEndPanel(false);
    setActiveIndex(0);
  }, [audio]);

  const handleChunkSelect = useCallback((index: number) => {
    audio.stop();
    audio.setAudioState("idle");
    setActiveIndex(index);
    setShowEndPanel(false);
  }, [audio]);

  const handleToggleFlag = useCallback((chunkId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId); else next.add(chunkId);
      savePassiveFlags(documentId, Array.from(next));
      return next;
    });
  }, [documentId]);

  const handleStartActive = useCallback(() => {
    const flags = Array.from(flaggedIds);
    const recIds = recommendations.map((r) => r.chunkId);
    const priority = [...new Set([...flags, ...recIds])];
    const startIndex = priority.length > 0
      ? Math.max(0, processedDocument.chunks.findIndex((c) => priority.includes(c.id)))
      : 0;
    onSwitchToActive(startIndex, flags);
  }, [flaggedIds, recommendations, processedDocument, onSwitchToActive]);

  useEffect(() => {
    if (!showEndPanel) return;
    const chunks = processedDocument.chunks.map((c, i) => ({ id: c.id, title: `Section ${i + 1}`, summary: c.summary }));
    fetch("/api/passive-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks, flaggedIds: Array.from(flaggedIds) }),
    }).then((r) => r.json()).then((d) => { if (d.recommendations) setRecommendations(d.recommendations); }).catch(() => {});
  }, [showEndPanel, processedDocument, flaggedIds]);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Steep <span className="text-blue-400 text-xs ml-1">🎧 Listen</span></span>
        <div className="flex gap-3 items-center pr-9">
          {onOpenSettings && <button onClick={onOpenSettings} className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline">Settings</button>}
          <button onClick={onNewDocument} className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline">New document</button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <PassiveChunkList
          chunks={processedDocument.chunks}
          statuses={statuses}
          flaggedIds={flaggedIds}
          activeIndex={activeIndex}
          onChunkSelect={handleChunkSelect}
          onToggleFlag={handleToggleFlag}
        />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 pb-24">
          {showEndPanel
            ? <EndPanel recommendations={recommendations} chunks={processedDocument.chunks} onStartActive={handleStartActive} onRestart={handleRestart} />
            : <ChunkDisplay chunk={processedDocument.chunks[activeIndex]} />}
        </main>
      </div>
      <AudioToolbar state={audio.audioState} speed={speed} currentChunk={activeIndex} totalChunks={processedDocument.chunks.length} onPlay={handlePlay} onPause={audio.pause} onRestart={handleRestart} onSpeedChange={setSpeed} />
    </div>
  );
}

function ChunkDisplay({ chunk }: { chunk?: { summary: string; text: string } }) {
  if (!chunk) return null;
  return (
    <div className="max-w-2xl mx-auto py-10 px-8 space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-slate-700 dark:text-slate-300">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide block mb-1">Overview</span>
        {chunk.summary}
      </div>
      <div className="prose prose-sm max-w-none leading-relaxed reading-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{chunk.text}</ReactMarkdown>
      </div>
    </div>
  );
}

function EndPanel({ recommendations, chunks, onStartActive, onRestart }: {
  recommendations: { chunkId: string; reason: string }[];
  chunks: { id: string }[];
  onStartActive: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto py-10 px-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">End of document</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">You&apos;ve listened to the full document.</p>
      </div>
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Based on what you heard, here are sections worth reading actively:</p>
          {recommendations.map((rec) => {
            const idx = chunks.findIndex((c) => c.id === rec.chunkId);
            return (
              <div key={rec.chunkId} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Section {idx + 1}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{rec.reason}</p>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onStartActive} className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors">Start Active Reading →</button>
        <button onClick={onRestart} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Listen Again</button>
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
