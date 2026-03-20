import Anthropic from "@anthropic-ai/sdk";
import type { ProcessedDocument } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

export async function processDocument(text: string): Promise<ProcessedDocument> {
  const prompt = buildProcessingPrompt(text);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseProcessedDocument(content.text);
}

export async function checkRecall(
  chunkText: string,
  userRecall: string
): Promise<{ feedback: string; gaps: string[]; strengths: string[] }> {
  const prompt = buildRecallPrompt(chunkText, userRecall);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseRecallResponse(content.text);
}

function buildProcessingPrompt(text: string): string {
  return `You are a reading comprehension expert. Analyze this document and produce a structured JSON response.

DOCUMENT:
${text.substring(0, 12000)}

Produce a JSON object with this exact structure:
{
  "title": "document title",
  "chunks": [
    {
      "id": "chunk_1",
      "text": "verbatim chunk text (400-600 words)",
      "summary": "what this section establishes (not concludes) — 1-2 sentences",
      "concepts": [
        {
          "term": "key concept",
          "definition": "what it is",
          "mechanism": "HOW it works — nuts and bolts",
          "linkedConcepts": ["other term in doc"]
        }
      ],
      "adversarialQuestions": [
        "Socratic question targeting a weakness or unsupported assumption in THIS document",
        "Another question exposing a logical gap"
      ]
    }
  ]
}

Rules:
- Split into 3-6 chunks of 400-600 words each
- Summary describes what the chunk ESTABLISHES, not what it concludes
- adversarialQuestions challenge the DOCUMENT's claims, not comprehension
- Each chunk has 1-3 concepts and 2-3 adversarialQuestions
- Return ONLY valid JSON, no markdown code blocks`;
}

function buildRecallPrompt(chunkText: string, userRecall: string): string {
  return `Compare the user's recall against the source text. Be precise about gaps and honest about strengths.

SOURCE TEXT:
${chunkText.substring(0, 3000)}

USER'S RECALL:
${userRecall}

Return JSON:
{
  "feedback": "2-3 sentence explanation of gaps and how understanding differs from source",
  "gaps": ["specific thing missed or misrepresented"],
  "strengths": ["what the user got right"]
}

Return ONLY valid JSON.`;
}

function parseProcessedDocument(text: string): ProcessedDocument {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as ProcessedDocument;
}

function parseRecallResponse(text: string): { feedback: string; gaps: string[]; strengths: string[] } {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}
