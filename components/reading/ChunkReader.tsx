"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Chunk, Concept, ReadingStep, RecallCheckResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConceptPanel } from "@/components/concepts/ConceptPanel";
import { ReadingPacer } from "@/components/reading/ReadingPacer";
import { loadAIConfig } from "@/lib/ai/config";

interface Props {
  chunk: Chunk;
  allConcepts: Concept[];
  onComplete: () => void;
  isLast: boolean;
}

export function ChunkReader({ chunk, allConcepts, onComplete, isLast }: Props) {
  const [step, setStep] = useState<ReadingStep>("pre-field");
  const [preField, setPreField] = useState("");
  const [postField, setPostField] = useState("");
  const [recallFeedback, setRecallFeedback] = useState<RecallCheckResponse | null>(null);
  const [loadingRecall, setLoadingRecall] = useState(false);
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);

  useEffect(() => {
    setStep("pre-field");
    setPreField("");
    setPostField("");
    setRecallFeedback(null);
    setActiveConcept(null);
  }, [chunk.id]);

  async function submitRecall() {
    if (!postField.trim()) return;
    setLoadingRecall(true);
    try {
      const aiConfig = loadAIConfig();
      const res = await fetch("/api/check-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkText: chunk.text, userRecall: postField, aiConfig }),
      });
      const data = await res.json();
      setRecallFeedback(data);
      setStep("correction");
    } catch {
      setStep("correction");
    } finally {
      setLoadingRecall(false);
    }
  }

  function handleConceptClick(term: string) {
    const concept = allConcepts.find((c) => c.term.toLowerCase() === term.toLowerCase());
    if (concept) setActiveConcept(concept);
  }

  return (
    <div className="relative">
      {activeConcept && (
        <ConceptPanel
          concept={activeConcept}
          allConcepts={allConcepts}
          onClose={() => setActiveConcept(null)}
        />
      )}
      <div className="max-w-2xl mx-auto space-y-6">
        <StepIndicator current={step} />

        {step === "pre-field" && (
          <PreField value={preField} onChange={setPreField} onNext={() => setStep("summary")} />
        )}
        {step === "summary" && (
          <SummaryView summary={chunk.summary} onNext={() => setStep("reading")} />
        )}
        {step === "reading" && (
          <ReadingView
            text={chunk.text}
            concepts={chunk.concepts}
            onConceptClick={handleConceptClick}
            onNext={() => setStep("post-field")}
          />
        )}
        {step === "post-field" && (
          <PostField
            value={postField}
            onChange={setPostField}
            onSubmit={submitRecall}
            loading={loadingRecall}
          />
        )}
        {step === "correction" && recallFeedback && (
          <CorrectionView feedback={recallFeedback} onNext={() => setStep("adversarial")} />
        )}
        {step === "adversarial" && (
          <AdversarialView questions={chunk.adversarialQuestions} onNext={onComplete} isLast={isLast} />
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: ReadingStep }) {
  const steps: ReadingStep[] = ["pre-field", "summary", "reading", "post-field", "correction", "adversarial"];
  const labels = ["Predict", "Overview", "Read", "Recall", "Feedback", "Challenge"];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`text-xs px-2 py-0.5 rounded ${
            i === idx
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              : i < idx
                ? "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                : "text-slate-300 dark:text-slate-600"
          }`}>{labels[i]}</div>
          {i < steps.length - 1 && (
            <span className="text-slate-200 dark:text-slate-700">›</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function PreField({ value, onChange, onNext }: {
  value: string; onChange: (v: string) => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Before you read</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          What do you already know about this topic? What do you expect to find?
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional — write your prediction or prior knowledge..."
        className="min-h-[120px]"
      />
      <Button onClick={onNext}>Continue →</Button>
    </div>
  );
}

function SummaryView({ summary, onNext }: { summary: string; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Section overview</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">This section establishes:</p>
      </div>
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
        {summary}
      </div>
      <Button onClick={onNext}>Read section →</Button>
    </div>
  );
}

function ReadingView({ text, onNext }: {
  text: string; concepts?: Concept[]; onConceptClick?: (t: string) => void; onNext: () => void;
}) {
  const [pacerOn, setPacerOn] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">Read the section below</span>
        <button
          onClick={() => setPacerOn((v) => !v)}
          className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {pacerOn ? "Plain text" : "⏩ Pacer"}
        </button>
      </div>

      {pacerOn ? (
        <ReadingPacer text={text} />
      ) : (
        <div className="prose prose-sm max-w-none leading-relaxed reading-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}

      <Button onClick={onNext}>Done reading →</Button>
    </div>
  );
}

function PostField({ value, onChange, onSubmit, loading }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Recall in your own words</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Summarize what you just read without looking back. Be specific.
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write what you remember..."
        className="min-h-[160px]"
      />
      <Button onClick={onSubmit} disabled={!value.trim() || loading}>
        {loading ? "Checking..." : "Submit recall →"}
      </Button>
    </div>
  );
}

function CorrectionView({ feedback, onNext }: { feedback: RecallCheckResponse; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900 dark:text-slate-100">Recall feedback</h3>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feedback.feedback}</p>
      {feedback.gaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Gaps</p>
          <ul className="space-y-1">
            {feedback.gaps.map((g, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                <span className="text-red-400">·</span>{g}
              </li>
            ))}
          </ul>
        </div>
      )}
      {feedback.strengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Strengths</p>
          <ul className="space-y-1">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                <span className="text-green-500">·</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={onNext}>Continue to questions →</Button>
    </div>
  );
}

function AdversarialView({ questions, onNext, isLast }: {
  questions: string[]; onNext: () => void; isLast: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Challenge questions</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          These questions target assumptions and gaps in the document itself.
        </p>
      </div>
      <ul className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-slate-800 dark:text-slate-200">
            {q}
          </li>
        ))}
      </ul>
      <Button onClick={onNext}>{isLast ? "Finish document" : "Next section →"}</Button>
    </div>
  );
}
