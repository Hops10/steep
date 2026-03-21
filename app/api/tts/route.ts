import { NextRequest, NextResponse } from "next/server";

function preprocessText(text: string): string {
  return text
    .replace(/```[^`]*```/g, "code block omitted")
    .replace(/\$\$[^$]*\$\$/g, "equation omitted")
    .replace(/\$[^$\n]+\$/g, "equation omitted")
    .replace(/^\|.+\|$/gm, "")
    .replace(/^\s*\|?[-: |]+\|?\s*$/gm, "table omitted")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*>\s/gm, "")
    .replace(/^-{3,}$/gm, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\([A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?,\s*\d{4}[a-z]?\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function openaiTTS(text: string, apiKey: string, voice: string, model: string): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const response = await client.audio.speech.create({
    model: model as "tts-1" | "tts-1-hd",
    voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function grokTTS(text: string, apiKey: string, voice: string): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voice, language: "en" }),
  });
  if (!res.ok) throw new Error(`Grok TTS error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function geminiTTS(text: string, apiKey: string): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (ai.models.generateContent as any)({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts: [{ text: `Read aloud: ${text}` }] }],
    config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (response as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as string | undefined;
  if (!data) throw new Error("No audio data from Gemini");
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { text, aiConfig, voiceConfig } = await req.json() as {
      text: string;
      aiConfig?: { provider: string; apiKey?: string; baseUrl?: string };
      voiceConfig?: { ttsProvider?: string; ttsApiKey?: string; openaiVoice?: string; openaiTTSModel?: string; geminiVoice?: string; grokVoice?: string };
    };
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const processed = preprocessText(text);

    // Resolve TTS provider and API key independently of AI reasoning provider
    const ttsProvider = voiceConfig?.ttsProvider ?? "browser";
    const aiProvider = aiConfig?.provider ?? "browser";

    // Key resolution:
    // If ttsProvider matches aiConfig.provider → use voiceConfig.ttsApiKey ?? aiConfig.apiKey
    // If different providers → use voiceConfig.ttsApiKey (may be empty → fall back to browser TTS)
    const resolvedKey =
      voiceConfig?.ttsApiKey ||
      (ttsProvider === aiProvider ? aiConfig?.apiKey : undefined);

    if (ttsProvider === "openai") {
      if (!resolvedKey) return NextResponse.json({ useClientTTS: true, text: processed });
      const voice = voiceConfig?.openaiVoice ?? "alloy";
      const model = voiceConfig?.openaiTTSModel ?? "tts-1";
      const audio = await openaiTTS(processed, resolvedKey, voice, model);
      return NextResponse.json({ audio, mimeType: "audio/mp3" });
    }

    if (ttsProvider === "gemini") {
      if (!resolvedKey) return NextResponse.json({ useClientTTS: true, text: processed });
      const audio = await geminiTTS(processed, resolvedKey);
      return NextResponse.json({ audio, mimeType: "audio/wav" });
    }

    if (ttsProvider === "grok") {
      if (!resolvedKey) return NextResponse.json({ useClientTTS: true, text: processed });
      const voice = voiceConfig?.grokVoice ?? "eve";
      const audio = await grokTTS(processed, resolvedKey, voice);
      return NextResponse.json({ audio, mimeType: "audio/mp3" });
    }

    // browser (default) or unrecognized provider — fall back to browser TTS
    return NextResponse.json({ useClientTTS: true, text: processed });

  } catch (err) {
    console.error("TTS error:", err);
    // On any error, fall back to browser TTS rather than breaking passive mode
    return NextResponse.json({ useClientTTS: true, text: "Audio generation failed. Using browser voice." });
  }
}
