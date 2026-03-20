"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props { text: string }
type PacerState = "idle" | "running" | "paused" | "done";
interface Phrase { text: string; wordCount: number; blockIndex: number }

const WPM_KEY = "steep_pacer_wpm";
const DEFAULT_WPM = 200;
const MIN_WPM = 50;
const MAX_WPM = 600;
const WPM_STEP = 25;

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "").replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "").replace(/^\s*\d+\.\s/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/^\s*>\s/gm, "")
    .replace(/^-{3,}$/gm, "").trim();
}

function splitBlocks(markdown: string): string[] {
  return markdown.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
}

function blockToPhrases(block: string, blockIndex: number): Phrase[] {
  const words = stripMarkdown(block).split(/\s+/).filter(Boolean);
  const phrases: Phrase[] = [];
  let i = 0;
  while (i < words.length) {
    const ends = (idx: number) => /[.!?]["']?$/.test(words[idx]);
    const group = [words[i]];
    if (!ends(i) && i + 1 < words.length) {
      group.push(words[i + 1]);
      if (!ends(i + 1) && i + 2 < words.length) group.push(words[i + 2]);
    }
    phrases.push({ text: group.join(" "), wordCount: group.length, blockIndex });
    i += group.length;
  }
  return phrases;
}

function phraseMs(wc: number, wpm: number) { return (wc / wpm) * 60000; }

function loadWpm(): number {
  if (typeof window === "undefined") return DEFAULT_WPM;
  const v = parseInt(localStorage.getItem(WPM_KEY) ?? "", 10);
  return isNaN(v) ? DEFAULT_WPM : Math.max(MIN_WPM, Math.min(MAX_WPM, v));
}

export function ReadingPacer({ text }: Props) {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  const phrases = useMemo(() => blocks.flatMap((b, i) => blockToPhrases(b, i)), [blocks]);
  const blockRanges = useMemo(() => blocks.map((_, bi) => {
    const start = phrases.findIndex(p => p.blockIndex === bi);
    const count = phrases.filter(p => p.blockIndex === bi).length;
    return { start, end: start + count - 1 };
  }), [blocks, phrases]);

  const [wpm, setWpm] = useState(DEFAULT_WPM);
  const [state, setState] = useState<PacerState>("idle");
  const [index, setIndex] = useState(0);

  const stateRef = useRef<PacerState>("idle");
  const indexRef = useRef(0);
  const wpmRef = useRef(DEFAULT_WPM);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stepRef = useRef<() => void>(() => {});

  useEffect(() => { const v = loadWpm(); setWpm(v); wpmRef.current = v; }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { wpmRef.current = wpm; localStorage.setItem(WPM_KEY, String(wpm)); }, [wpm]);
  // Scroll only when phrase nears the bottom edge of the viewport.
  // When a scroll fires, pause the timer and add an eye-settle delay before resuming.
  const EYE_SETTLE_MS = 400;
  const SCROLL_THRESHOLD = 0.72; // scroll when phrase bottom exceeds 72% of viewport height

  useEffect(() => {
    const el = phraseRefs.current[index];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    if (rect.bottom < viewportH * SCROLL_THRESHOLD) return; // still comfortably in view — don't scroll

    // Scroll phrase to upper-third of viewport so reader has runway ahead
    const targetTop = el.getBoundingClientRect().top + window.scrollY - viewportH * 0.28;
    window.scrollTo({ top: targetTop, behavior: "smooth" });

    // If pacer is running, suspend timer and restart after scroll + eye settle
    if (stateRef.current === "running" && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (stateRef.current === "running") {
          timerRef.current = setTimeout(
            () => stepRef.current(),
            phraseMs(phrases[index]?.wordCount ?? 2, wpmRef.current)
          );
        }
      }, EYE_SETTLE_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    stepRef.current = () => {
      const next = indexRef.current + 1;
      if (next >= phrases.length) { setState("done"); stateRef.current = "done"; return; }
      indexRef.current = next; setIndex(next);
      timerRef.current = setTimeout(() => stepRef.current(), phraseMs(phrases[next].wordCount, wpmRef.current));
    };
  }, [phrases]);

  const clearTimer = useCallback(() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }, []);

  const start = useCallback(() => {
    setState("running"); stateRef.current = "running";
    timerRef.current = setTimeout(() => stepRef.current(), phraseMs(phrases[indexRef.current].wordCount, wpmRef.current));
  }, [phrases]);

  const pause = useCallback(() => { clearTimer(); setState("paused"); stateRef.current = "paused"; }, [clearTimer]);
  const resume = useCallback(() => start(), [start]);
  const restart = useCallback(() => { clearTimer(); indexRef.current = 0; setIndex(0); setState("idle"); stateRef.current = "idle"; }, [clearTimer]);
  const adjustWpm = useCallback((d: number) => setWpm(p => { const n = Math.max(MIN_WPM, Math.min(MAX_WPM, p + d)); wpmRef.current = n; return n; }), []);

  const goBack = useCallback(() => {
    clearTimer();
    const prev = Math.max(0, indexRef.current - 1);
    indexRef.current = prev; setIndex(prev);
    if (stateRef.current === "running") timerRef.current = setTimeout(() => stepRef.current(), phraseMs(phrases[prev].wordCount, wpmRef.current));
  }, [clearTimer, phrases]);

  const goForward = useCallback(() => {
    clearTimer();
    const next = Math.min(phrases.length - 1, indexRef.current + 1);
    indexRef.current = next; setIndex(next);
    if (stateRef.current === "running") timerRef.current = setTimeout(() => stepRef.current(), phraseMs(phrases[next].wordCount, wpmRef.current));
    else if (stateRef.current === "paused") resume();
  }, [clearTimer, phrases, resume]);

  const clickPhrase = useCallback((i: number) => {
    clearTimer(); indexRef.current = i; setIndex(i);
    if (stateRef.current === "running") timerRef.current = setTimeout(() => stepRef.current(), phraseMs(phrases[i].wordCount, wpmRef.current));
    else if (stateRef.current === "done") { setState("paused"); stateRef.current = "paused"; }
  }, [clearTimer, phrases]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      if (e.key === " ") { e.preventDefault(); stateRef.current === "running" ? pause() : start(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goForward(); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); adjustWpm(WPM_STEP); }
      else if (e.key === "ArrowDown") { e.preventDefault(); adjustWpm(-WPM_STEP); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [start, pause, goBack, goForward, restart, adjustWpm]);

  const currentBlock = phrases[index]?.blockIndex ?? 0;

  return (
    <div className="space-y-4">
      <PacerToolbar state={state} wpm={wpm} onStart={start} onPause={pause} onResume={resume} onRestart={restart} onAdjust={adjustWpm} />
      <div className="leading-relaxed text-sm">
        {blocks.map((block, bi) => {
          const range = blockRanges[bi];
          if (bi === currentBlock) {
            return (
              <div key={bi} className="mb-4">
                {phrases.slice(range.start, range.end + 1).map((phrase, pi) => {
                  const gi = range.start + pi;
                  return (
                    <span key={gi} ref={el => { phraseRefs.current[gi] = el; }} onClick={() => clickPhrase(gi)}
                      className={cn("cursor-pointer rounded px-0.5 transition-colors",
                        gi === index ? "bg-amber-300 dark:bg-amber-400 text-slate-900 font-semibold"
                          : gi < index ? "opacity-60 text-slate-500 dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-200")}>
                      {phrase.text}{" "}
                    </span>
                  );
                })}
              </div>
            );
          }
          return (
            <div key={bi} onClick={() => range.start >= 0 && clickPhrase(range.start)}
              className={cn("mb-4 prose dark:prose-invert max-w-none prose-sm cursor-pointer",
                bi < currentBlock ? "opacity-50" : "")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
            </div>
          );
        })}
      </div>
      {state === "done" && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
          ✓ End of section — ready to recall?
        </div>
      )}
    </div>
  );
}

interface ToolbarProps { state: PacerState; wpm: number; onStart: () => void; onPause: () => void; onResume: () => void; onRestart: () => void; onAdjust: (d: number) => void }

function PacerToolbar({ state, wpm, onStart, onPause, onResume, onRestart, onAdjust }: ToolbarProps) {
  const btn = "text-xs px-2 py-1 rounded border transition-colors border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700";
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex-wrap">
      <PlayPauseBtn state={state} onStart={onStart} onPause={onPause} onResume={onResume} />
      <button onClick={onRestart} className={btn} title="Restart (R)">↺ Restart</button>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={() => onAdjust(-WPM_STEP)} className={btn} title="Slow down (↓)">−</button>
        <span className="text-xs text-slate-600 dark:text-slate-400 w-16 text-center tabular-nums">{wpm} WPM</span>
        <button onClick={() => onAdjust(WPM_STEP)} className={btn} title="Speed up (↑)">+</button>
      </div>
    </div>
  );
}

function PlayPauseBtn({ state, onStart, onPause, onResume }: Pick<ToolbarProps, "state" | "onStart" | "onPause" | "onResume">) {
  const cls = "text-xs px-3 py-1 rounded font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors";
  if (state === "running") return <button onClick={onPause} className={cls} title="Pause (Space)">⏸ Pause</button>;
  if (state === "paused") return <button onClick={onResume} className={cls} title="Resume (Space)">▶ Resume</button>;
  if (state === "done") return <button onClick={onResume} className={cls}>▶ Replay</button>;
  return <button onClick={onStart} className={cls} title="Start (Space)">▶ Start</button>;
}
