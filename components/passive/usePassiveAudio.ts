"use client";

import { useState, useRef, useCallback } from "react";
import type { VoiceConfig } from "@/types";
import type { AudioState, Speed } from "./AudioToolbar";

interface UsePassiveAudioOptions {
  speed: Speed;
  voiceConfig: VoiceConfig;
  onChunkEnded: (index: number) => void;
}

export function usePassiveAudio({ speed, voiceConfig, onChunkEnded }: UsePassiveAudioOptions) {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const playBrowser = useCallback((text: string, index: number) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speed;
    utt.onend = () => onChunkEnded(index);
    utt.onerror = () => setAudioState("idle");
    window.speechSynthesis.speak(utt);
  }, [speed, onChunkEnded]);

  const playBuffer = useCallback(async (base64: string, index: number) => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const buffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(ctx.destination);
    source.onended = () => onChunkEnded(index);
    sourceRef.current = source;
    source.start();
  }, [speed, onChunkEnded]);

  const play = useCallback(async (chunkText: string, index: number) => {
    setAudioState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chunkText,
          provider: voiceConfig.provider,
          apiKey: voiceConfig.apiKey,
          voice: voiceConfig.voice,
          model: voiceConfig.model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAudioState("playing");
      if (data.provider === "browser") {
        playBrowser(data.text ?? chunkText, index);
      } else {
        await playBuffer(data.audio, index);
      }
    } catch (err) {
      console.error("TTS play error:", err);
      setAudioState("idle");
    }
  }, [voiceConfig, playBrowser, playBuffer]);

  const pause = useCallback(() => {
    audioCtxRef.current?.suspend();
    if (typeof window !== "undefined") window.speechSynthesis?.pause();
    setAudioState("paused");
  }, []);

  const resume = useCallback(() => {
    audioCtxRef.current?.resume();
    if (typeof window !== "undefined") window.speechSynthesis?.resume();
    setAudioState("playing");
  }, []);

  return { audioState, setAudioState, play, pause, resume, stop };
}
