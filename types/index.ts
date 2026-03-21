// Core document types for Steep

export interface Concept {
  term: string;
  definition: string;
  mechanism: string;
  linkedConcepts: string[];
}

export interface Chunk {
  id: string;
  text: string;
  summary: string;
  concepts: Concept[];
  adversarialQuestions: string[];
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
// "heard" = listened in passive mode; "read" = completed active loop

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

// Voice/TTS configuration (Sprint 2)
export type VoiceProvider = "openai" | "gemini" | "browser";

export interface VoiceConfig {
  provider: VoiceProvider;
  voice?: string;  // openai: alloy/echo/fable/onyx/nova/shimmer
  model?: string;  // openai: tts-1 / tts-1-hd
  apiKey?: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = { provider: "browser" };
export const VOICE_CONFIG_KEY = "steep_voice_config";

// Active reading session state
export type ReadingStep =
  | "pre-field"
  | "summary"
  | "reading"
  | "post-field"
  | "correction"
  | "adversarial";

export interface RecallCheckRequest {
  chunkText: string;
  userRecall: string;
}

export interface RecallCheckResponse {
  feedback: string;
  gaps: string[];
  strengths: string[];
}

// Synthesis layer (Sprint 2)
export interface ReviewRecommendation {
  timing: "1 day" | "1 week" | "1 month";
  focus: string;
}

export interface SynthesisResponse {
  feedback: string;
  reviewRecommendations: ReviewRecommendation[];
}

// Passive recommendations (Sprint 2)
export interface PassiveRecommendation {
  chunkId: string;
  reason: string;
}
