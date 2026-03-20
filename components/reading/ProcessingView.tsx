"use client";

import React from "react";

interface Props {
  title: string;
  wordCount: number;
}

export function ProcessingView({ title, wordCount }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex gap-1 mb-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1 text-lg">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{wordCount.toLocaleString()} words</p>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Analyzing structure, extracting concepts,
          <br />
          preparing adversarial questions…
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">This takes 20–60 seconds</p>
      </div>
    </div>
  );
}
