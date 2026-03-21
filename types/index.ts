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

export type ChunkStatus = "unread" | "heard" | "read";

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

export const VOICE_CONFIG_KEY = "steep_voice_config";

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type OpenAITTSModel = "gpt-4o-audio-preview" | "tts-1" | "tts-1-hd";
export type GeminiVoice = "Kore" | "Puck" | "Charon" | "Fenrir" | "Aoede";

export interface VoiceConfig {
  openaiVoice?: OpenAIVoice;
  openaiTTSModel?: OpenAITTSModel;
  geminiVoice?: GeminiVoice;
  browserVoiceURI?: string;
  speed?: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = { speed: 1.0 };

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

export interface ReviewRecommendation {
  timing: "1 day" | "1 week" | "1 month";
  focus: string;
}

export interface SynthesisResponse {
  feedback: string;
  reviewRecommendations: ReviewRecommendation[];
}

export interface PassiveRecommendation {
  chunkId: string;
  reason: string;
}
