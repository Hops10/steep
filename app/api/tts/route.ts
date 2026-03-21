import { NextRequest, NextResponse } from "next/server";

function preprocessText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "code block omitted")
    .replace(/\$\$[\s\S]*?\$\$/g, "equation omitted")
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

async function openaiTTS(
  text: string, apiKey: string, voice: string, model: string
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const response = await client.audio.speech.create({
    model: model || "tts-1",
    voice: (voice || "alloy") as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

async function geminiTTS(text: string, apiKey: string): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts: [{ text: `Read aloud: ${text}` }] }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } } } as any,
  });
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio data returned from Gemini");
  return audioData;
}

export async function POST(req: NextRequest) {
  try {
    const { text, provider, apiKey, voice, model } = await req.json();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const processed = preprocessText(text);

    if (provider === "browser") {
      return NextResponse.json({ provider: "browser", text: processed });
    }
    if (provider === "openai") {
      if (!apiKey) return NextResponse.json({ error: "OpenAI API key required" }, { status: 400 });
      const audio = await openaiTTS(processed, apiKey, voice ?? "alloy", model ?? "tts-1");
      return NextResponse.json({ provider: "openai", audio, mimeType: "audio/mp3" });
    }
    if (provider === "gemini") {
      if (!apiKey) return NextResponse.json({ error: "Gemini API key required" }, { status: 400 });
      const audio = await geminiTTS(processed, apiKey);
      return NextResponse.json({ provider: "gemini", audio, mimeType: "audio/wav" });
    }
    return NextResponse.json({ error: "Unknown TTS provider" }, { status: 400 });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "TTS failed" }, { status: 500 });
  }
}
