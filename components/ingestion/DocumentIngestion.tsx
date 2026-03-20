"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RawDocument } from "@/types";
import { estimateWordCount, extractTitle } from "@/lib/utils";

interface Props {
  onDocumentReady: (doc: RawDocument) => void;
}

type InputMode = "paste" | "url" | "file";

export function DocumentIngestion({ onDocumentReady }: Props) {
  const [mode, setMode] = useState<InputMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePaste() {
    if (!pasteText.trim()) return;
    onDocumentReady({
      text: pasteText,
      title: extractTitle(pasteText),
      wordCount: estimateWordCount(pasteText),
      sourceType: "paste",
    });
  }

  async function handleUrl() {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDocumentReady({
        text: data.text,
        title: extractTitle(data.text, urlInput),
        wordCount: estimateWordCount(data.text),
        sourceType: "url",
        sourceUrl: urlInput,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ingest-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const sourceType = file.name.endsWith(".pdf") ? "pdf" : "word";
      onDocumentReady({
        text: data.text,
        title: extractTitle(data.text, file.name),
        wordCount: estimateWordCount(data.text),
        sourceType,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Steep</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Active reading for professionals</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["paste", "url", "file"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === m
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-600"
            }`}
          >
            {m === "paste" ? "Paste text" : m === "url" ? "URL" : "Upload file"}
          </button>
        ))}
      </div>

      {mode === "paste" && (
        <div className="space-y-3">
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your document text here… Supports plain text or markdown (#, *, -, **bold**)."
            className="min-h-[300px] font-mono text-xs"
          />
          <Button onClick={handlePaste} disabled={!pasteText.trim()}>
            Load document
          </Button>
        </div>
      )}

      {mode === "url" && (
        <div className="space-y-3">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            onKeyDown={(e) => e.key === "Enter" && handleUrl()}
          />
          <Button onClick={handleUrl} disabled={loading || !urlInput.trim()}>
            {loading ? "Fetching..." : "Fetch & load"}
          </Button>
        </div>
      )}

      {mode === "file" && (
        <div className="space-y-3">
          <div
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Click to upload PDF or Word (.docx)
            </p>
            <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={handleFile} className="hidden" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
