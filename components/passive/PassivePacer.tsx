"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  splitBlocks, blockToPhrases, blockToWords, buildBlockRanges,
  loadGranularity, saveGranularity,
  type Granularity, type Phrase, type Word,
} from "@/lib/pacer";

interface Props {
  text: string;
  isPlaying: boolean;
  getDuration: () => number;
  getElapsed: () => number;
  getWordBoundaryIndex: () => number;
  getIsBrowserTTS: () => boolean;
}

const EYE_SETTLE_MS = 400;
const SCROLL_THRESHOLD = 0.72;

export function PassivePacer({ text, isPlaying, getDuration, getElapsed, getWordBoundaryIndex, getIsBrowserTTS }: Props) {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  const phrases = useMemo<Phrase[]>(() => blocks.flatMap((b, i) => blockToPhrases(b, i)), [blocks]);
  const words = useMemo<Word[]>(() => blocks.flatMap((b, i) => blockToWords(b, i)), [blocks]);
  const phraseRanges = useMemo(() => buildBlockRanges(blocks.length, phrases), [blocks.length, phrases]);
  const wordRanges = useMemo(() => buildBlockRanges(blocks.length, words), [blocks.length, words]);

  const [granularity, setGranularity] = useState<Granularity>(() => loadGranularity());
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasDuration, setHasDuration] = useState(false);
  const [isBrowserTTS, setIsBrowserTTS] = useState(false);

  const activeRef = useRef(0);
  const granularityRef = useRef<Granularity>(granularity);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGranularityChange = useCallback((g: Granularity) => {
    granularityRef.current = g;
    setGranularity(g);
    saveGranularity(g);
    activeRef.current = 0;
    setActiveIndex(0);
  }, []);

  // Scroll into view when active index changes
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < window.innerHeight * SCROLL_THRESHOLD) return;
    const targetTop = rect.top + window.scrollY - window.innerHeight * 0.28;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    // Eye-settle: clear any pending re-scroll timer
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => { scrollTimerRef.current = null; }, EYE_SETTLE_MS);
  }, [activeIndex]);

  // Main RAF loop — polls timing refs and advances the highlighted item
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const duration = getDuration();
      const elapsed = getElapsed();
      const browserTTS = getIsBrowserTTS();
      setHasDuration(duration > 0);
      setIsBrowserTTS(browserTTS);

      const g = granularityRef.current;
      let next = 0;
      if (g === "phrase") {
        if (duration > 0) {
          next = Math.min(phrases.length - 1, Math.floor((elapsed / duration) * phrases.length));
        }
      } else {
        // word mode
        if (browserTTS) {
          next = Math.min(words.length - 1, getWordBoundaryIndex());
        } else if (duration > 0) {
          next = Math.min(words.length - 1, Math.floor((elapsed / duration) * words.length));
        }
      }

      if (next !== activeRef.current) {
        activeRef.current = next;
        setActiveIndex(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, phrases.length, words.length]);

  // Reset when text changes
  useEffect(() => {
    activeRef.current = 0;
    setActiveIndex(0);
  }, [text]);

  const currentBlockIndex = granularity === "phrase"
    ? (phrases[activeIndex]?.blockIndex ?? 0)
    : (words[activeIndex]?.blockIndex ?? 0);

  // Duration unknown in phrase mode (browser TTS) → pulsing container
  const showPulse = isPlaying && !hasDuration && granularity === "phrase";

  const showEstimatedNote = granularity === "word" && !isBrowserTTS && hasDuration;

  return (
    <div className="space-y-3">
      <PacerToolbar granularity={granularity} onChange={handleGranularityChange} />
      {showEstimatedNote && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          ⚡ Word-by-word sync is approximate for OpenAI/Grok/Gemini — exact for browser voice
        </p>
      )}
      <div className={cn(
        "leading-relaxed text-sm !text-slate-900 dark:!text-white rounded-lg transition-all",
        showPulse && "border-2 border-blue-300 dark:border-blue-600 p-3 animate-pulse"
      )}>
        {showPulse ? (
          <div className="prose prose-sm max-w-none reading-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          blocks.map((block, bi) => {
            if (bi === currentBlockIndex) {
              if (granularity === "phrase") {
                const range = phraseRanges[bi];
                return (
                  <div key={bi} className="mb-4">
                    {phrases.slice(range.start, range.end + 1).map((phrase, pi) => {
                      const gi = range.start + pi;
                      return (
                        <span key={gi}
                          ref={el => { itemRefs.current[gi] = el; }}
                          className={cn("rounded px-0.5",
                            gi === activeIndex && "border-b-2 border-amber-400 dark:border-amber-500"
                          )}>
                          {phrase.text}{" "}
                        </span>
                      );
                    })}
                  </div>
                );
              } else {
                const range = wordRanges[bi];
                return (
                  <div key={bi} className="mb-4">
                    {words.slice(range.start, range.end + 1).map((word, wi) => {
                      const gi = range.start + wi;
                      return (
                        <span key={gi}
                          ref={el => { itemRefs.current[gi] = el; }}
                          className={cn("rounded px-0.5",
                            gi === activeIndex && "border-b-2 border-amber-400 dark:border-amber-500"
                          )}>
                          {word.text}{" "}
                        </span>
                      );
                    })}
                  </div>
                );
              }
            }
            return (
              <div key={bi} className="mb-4 prose prose-sm max-w-none reading-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ToolbarProps { granularity: Granularity; onChange: (g: Granularity) => void }

function PacerToolbar({ granularity, onChange }: ToolbarProps) {
  const pill = "text-xs px-2.5 py-1 rounded-full font-medium transition-colors focus:outline-none";
  const active = "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900";
  const inactive = "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Highlight</span>
      <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 bg-slate-50 dark:bg-slate-800">
        <button onClick={() => onChange("phrase")} className={cn(pill, granularity === "phrase" ? active : inactive)}>
          Phrase
        </button>
        <button onClick={() => onChange("word")} className={cn(pill, granularity === "word" ? active : inactive)}>
          Word
        </button>
      </div>
    </div>
  );
}
