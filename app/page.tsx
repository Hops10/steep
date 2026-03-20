"use client";

import React, { useState } from "react";
import type { RawDocument, ProcessedDocument } from "@/types";
import { DocumentIngestion } from "@/components/ingestion/DocumentIngestion";
import { ProcessingView } from "@/components/reading/ProcessingView";
import { ReaderView } from "@/components/reading/ReaderView";

type AppState = "ingestion" | "processing" | "reading";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("ingestion");
  const [rawDocument, setRawDocument] = useState<RawDocument | null>(null);
  const [processedDocument, setProcessedDocument] = useState<ProcessedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDocumentReady(doc: RawDocument) {
    setRawDocument(doc);
    setAppState("processing");
    setError(null);

    try {
      const res = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: doc.text }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Processing failed");

      setProcessedDocument(data);
      setAppState("reading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process document");
      setAppState("ingestion");
    }
  }

  function handleNewDocument() {
    setAppState("ingestion");
    setRawDocument(null);
    setProcessedDocument(null);
    setError(null);
  }

  if (appState === "processing" && rawDocument) {
    return (
      <ProcessingView
        title={rawDocument.title}
        wordCount={rawDocument.wordCount}
      />
    );
  }

  if (appState === "reading" && rawDocument && processedDocument) {
    return (
      <ReaderView
        rawDocument={rawDocument}
        processedDocument={processedDocument}
        onNewDocument={handleNewDocument}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm shadow">
          {error}
        </div>
      )}
      <DocumentIngestion onDocumentReady={handleDocumentReady} />
    </div>
  );
}
