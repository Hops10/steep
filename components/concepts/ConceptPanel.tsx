"use client";

import React, { useState } from "react";
import type { Concept } from "@/types";

interface Props {
  concept: Concept;
  allConcepts: Concept[];
  onClose: () => void;
}

export function ConceptPanel({ concept, allConcepts, onClose }: Props) {
  const [history, setHistory] = useState<Concept[]>([]);
  const [current, setCurrent] = useState<Concept>(concept);

  function navigateTo(term: string) {
    const found = allConcepts.find((c) => c.term.toLowerCase() === term.toLowerCase());
    if (!found) return;
    setHistory((h) => [...h, current]);
    setCurrent(found);
  }

  function navigateBack() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrent(prev);
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {history.length > 0 ? (
            <button
              onClick={navigateBack}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
            >
              ← {history[history.length - 1].term}
            </button>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Concept
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {history.length > 0 && (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {history.map((h, i) => (
              <span key={i}>
                <button
                  onClick={() => { setCurrent(h); setHistory((hist) => hist.slice(0, i)); }}
                  className="hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  {h.term}
                </button>
                {" → "}
              </span>
            ))}
            <span className="text-slate-700 dark:text-slate-300">{current.term}</span>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {current.term}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{current.definition}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
            How it works
          </h3>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{current.mechanism}</p>
        </div>

        {current.linkedConcepts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Related concepts
            </h3>
            <div className="flex flex-wrap gap-2">
              {current.linkedConcepts.map((term) => {
                const found = allConcepts.some((c) => c.term.toLowerCase() === term.toLowerCase());
                return (
                  <button
                    key={term}
                    onClick={() => found && navigateTo(term)}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                      found
                        ? "border-slate-900 dark:border-slate-400 text-slate-900 dark:text-slate-300 hover:bg-slate-900 dark:hover:bg-slate-200 hover:text-white dark:hover:text-slate-900"
                        : "border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-default"
                    }`}
                  >
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
