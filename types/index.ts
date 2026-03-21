// Core document types for Steep

export interface Concept {
  term: string;
  definition: string;
  mechanism: string; // HOW it works, nuts and bolts
  linkedConcepts: string[]; // other concept terms in this doc
}

export interface Chunk {
  id: string;
  text: string;
  summary: string; // what this section *establishes* (not concludes)
  concepts: Concept[];
  adversarialQuestions: string[]; // 2-3 per chunk, Socratic
}

export interface ProcessedDocument {
  title: string;
  chunks: Chunk[];
}

export interface RawDocument {
  text: string;
  title: string;
  wordCount: number;
  sourceType: "paste" | "url" | "pdf" | "word";
  sourceUrl?: string;
}

// Per-chunk progress state
export type ChunkStatus = "unread" | "heard" | "read";

// Voice/TTS configuration (Sprint 2)
export type VoiceProvider = "openai" | "gemini" | "browser";

export interface VoiceConfig {
  provider: VoiceProvider;
  voice?: string;
  model?: string;
  apiKey?: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = { provider: "browser" };
export const VOICE_CONFIG_KEY = "steep_voice_config";

export interface ChunkProgress {
  chunkId: string;
  status: ChunkStatus;
  preFieldResponse?: string;
  postFieldResponse?: string;
  recallFeedback?: string;
}

export interface DocumentProgress {
  documentId: string;
  title: string;
  chunks: ChunkProgress[];
  lastActiveChunkIndex: number;
  savedAt: number;
}

// Active reading session state
export type ReadingStep =
  | "pre-field"    // step 1: prediction
  | "summary"      // step 2: structural summary
  | "reading"      // step 3: full text
  | "post-field"   // step 4: recall
  | "correction"   // step 5: AI feedback
  | "adversarial"; // step 6: Socratic questioning

export interface RecallCheckRequest {
  chunkText: string;
  userRecall: string;
}

export interface RecallCheckResponse {
  feedback: string;
  gaps: string[];
  strengths: string[];
}
