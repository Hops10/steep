"use client";

import React from "react";

export type AudioState = "idle" | "loading" | "playing" | "paused" | "done";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
export type Speed = typeof SPEEDS[number];

interface Props {
  state: AudioState;
  speed: Speed;
  currentChunk: number;
  totalChunks: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (s: Speed) => void;
}

export function AudioToolbar({
  state, speed, currentChunk, totalChunks,
  onPlay, onPause, onRestart, onSpeedChange,
}: Props) {
  const progress = totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-lg z-40">
      <ProgressBar progress={progress} />
      <div className="flex items-center gap-3 px-6 py-3 max-w-5xl mx-auto">
        <PlayControls state={state} onPlay={onPlay} onPause={onPause} onRestart={onRestart} />
        <ChunkCounter current={currentChunk} total={totalChunks} />
        <SpeedControl speeds={SPEEDS} current={speed} onChange={onSpeedChange} />
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function PlayControls({ state, onPlay, onPause, onRestart }: Pick<Props, "state" | "onPlay" | "onPause" | "onRestart">) {
  const btn = "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors";
  const primary = `${btn} bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200`;
  const secondary = `${btn} border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800`;

  return (
    <div className="flex items-center gap-2">
      {state === "playing" ? (
        <button onClick={onPause} className={primary}>⏸ Pause</button>
      ) : state === "loading" ? (
        <button disabled className={`${primary} opacity-60`}>Loading…</button>
      ) : (
        <button onClick={onPlay} className={primary}>▶ {state === "done" ? "Replay" : "Play"}</button>
      )}
      <button onClick={onRestart} className={secondary} title="Restart from beginning">↺</button>
    </div>
  );
}

function ChunkCounter({ current, total }: { current: number; total: number }) {
  return (
    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums ml-1">
      {current + 1} / {total}
    </span>
  );
}

function SpeedControl({ speeds, current, onChange }: {
  speeds: readonly Speed[];
  current: Speed;
  onChange: (s: Speed) => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Speed</span>
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            s === current
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}
