"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadAIConfig } from "@/lib/ai/config";

interface ReviewRec {
  timing: "1 day" | "1 week" | "1 month";
  focus: string;
}

interface SynthesisResult {
  feedback: string;
  reviewRecommendations: ReviewRec[];
}

interface Props {
  documentTitle: string;
  chunkSummaries: string[];
}

export function SynthesisPrompt({ documentTitle, chunkSummaries }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const aiConfig = loadAIConfig();
      const res = await fetch("/api/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentTitle, chunkSummaries, userSynthesis: text, aiConfig }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-12 border-t border-slate-200 dark:border-slate-700 pt-10 space-y-6">
      <SynthesisHeader />
      {!result ? (
        <SynthesisInput text={text} onChange={setText} onSubmit={handleSubmit} loading={loading} error={error} />
      ) : (
        <SynthesisResults result={result} onReset={() => { setResult(null); setText(""); }} />
      )}
    </div>
  );
}

function SynthesisHeader() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧠</span>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Synthesize</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        Now that you&apos;ve read the full document — what changed in your thinking? What would you push back on? What connects to things you already know?
      </p>
    </div>
  );
}

function SynthesisInput({ text, onChange, onSubmit, loading, error }: {
  text: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your synthesis here — be specific, be honest..."
        className="min-h-[160px]"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button onClick={onSubmit} disabled={!text.trim() || loading}>
        {loading ? "Getting feedback…" : "Submit synthesis →"}
      </Button>
    </div>
  );
}

function SynthesisResults({ result, onReset }: { result: SynthesisResult; onReset: () => void }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Feedback</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.feedback}</p>
      </div>
      {result.reviewRecommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Review schedule</p>
          {result.reviewRecommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap mt-0.5">{rec.timing}</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{rec.focus}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">
        Write another synthesis
      </button>
    </div>
  );
}
