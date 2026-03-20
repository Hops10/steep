export const PROCESSING_SYSTEM = `You are a reading comprehension expert. Analyze documents and produce structured JSON.`

export function buildProcessingPrompt(text: string): string {
  return `Analyze this document and produce a structured JSON response.

DOCUMENT:
${text.substring(0, 12000)}

Produce a JSON object with this exact structure:
{
  "title": "document title",
  "chunks": [
    {
      "id": "chunk_1",
      "text": "verbatim chunk text (400-600 words)",
      "summary": "what this section establishes — 1-2 sentences",
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
- Return ONLY valid JSON, no markdown code blocks`
}

export const RECALL_SYSTEM = `You are a reading comprehension evaluator. Compare user recall against source text precisely.`

export function buildRecallPrompt(chunkText: string, userRecall: string): string {
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

Return ONLY valid JSON.`
}

export function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}
