"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { VoiceConfig } from "@/types";
import type { AIConfig } from "@/lib/ai/types";
import { pcmToWav, base64ToArrayBuffer } from "@/lib/audio";
import type { AudioState, Speed } from "./AudioToolbar";

interface Options {
  speed: Speed;
  aiConfig: AIConfig;
  voiceConfig: VoiceConfig;
  onChunkEnded: (index: number) => void;
}

export function usePassiveAudio({ speed, aiConfig, voiceConfig, onChunkEnded }: Options) {
  const [audioState, setAudioState] = useState<AudioState>("idle");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Keep current speed accessible in callbacks without stale closures
  const speedRef = useRef<Speed>(speed);
  const audioStateRef = useRef<AudioState>("idle");
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { audioStateRef.current = audioState; }, [audioState]);

  // Timing: wall-clock elapsed / wall-clock duration both in seconds
  const durationRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Browser TTS tracking
  const isBrowserTTSRef = useRef<boolean>(false);
  const currentChunkRef = useRef<{ text: string; index: number } | null>(null);
  const wordBoundaryIndexRef = useRef<number>(0);
  // Stable ref to playBrowser (avoids stale closure in speed-change effect)
  const playBrowserRef = useRef<(text: string, index: number) => void>(() => {});

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const stop = useCallback(() => {
    cancelRaf();
    sourceRef.current?.stop();
    sourceRef.current = null;
    isBrowserTTSRef.current = false;
    elapsedRef.current = 0;
    durationRef.current = 0;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [cancelRaf]);

  // Reactively update playback rate on the live source node
  useEffect(() => {
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = speed;
      // Recalculate wall-clock duration at new speed (approximate; slight drift acceptable)
      if (sourceRef.current.buffer) {
        durationRef.current = sourceRef.current.buffer.duration / speed;
      }
    }
  }, [speed]);

  // Restart browser TTS mid-utterance when speed changes
  useEffect(() => {
    if (isBrowserTTSRef.current && audioStateRef.current === "playing" && currentChunkRef.current) {
      const { text, index } = currentChunkRef.current;
      window.speechSynthesis.cancel();
      playBrowserRef.current(text, index);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const playBrowser = useCallback((text: string, index: number) => {
    isBrowserTTSRef.current = true;
    durationRef.current = 0; // unknown for browser TTS
    elapsedRef.current = 0;
    wordBoundaryIndexRef.current = 0;
    currentChunkRef.current = { text, index };
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speedRef.current;
    if (voiceConfig.browserVoiceURI) {
      const match = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceConfig.browserVoiceURI);
      if (match) utt.voice = match;
    }
    utt.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word") {
        // Map charIndex to word count in the preceding text
        const preceding = text.slice(0, e.charIndex + (e.charLength ?? 1));
        wordBoundaryIndexRef.current = Math.max(0, preceding.trim().split(/\s+/).length - 1);
      }
    };
    utt.onend = () => { isBrowserTTSRef.current = false; onChunkEnded(index); };
    utt.onerror = () => setAudioState("idle");
    window.speechSynthesis.speak(utt);
  }, [voiceConfig.browserVoiceURI, onChunkEnded]);

  // Keep playBrowserRef pointing at the latest version
  useEffect(() => { playBrowserRef.current = playBrowser; }, [playBrowser]);

  const playBuffer = useCallback(async (base64: string, mimeType: string, index: number) => {
    isBrowserTTSRef.current = false;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const arrayBuf = mimeType.includes("pcm") ? pcmToWav(base64) : base64ToArrayBuffer(base64);
    const buffer = await ctx.decodeAudioData(arrayBuf);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(ctx.destination);

    durationRef.current = buffer.duration / speed; // wall-clock duration
    elapsedRef.current = 0;
    startTimeRef.current = ctx.currentTime;

    source.onended = () => { cancelRaf(); onChunkEnded(index); };
    sourceRef.current = source;
    source.start();

    // RAF loop tracking wall-clock elapsed
    cancelRaf();
    const tick = () => {
      elapsedRef.current = ctx.currentTime - startTimeRef.current;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, onChunkEnded, cancelRaf]);

  const play = useCallback(async (chunkText: string, index: number) => {
    setAudioState("loading");
    currentChunkRef.current = { text: chunkText, index };
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunkText, aiConfig, voiceConfig }),
      });
      const data = await res.json() as {
        audio?: string; mimeType?: string; useClientTTS?: boolean; text?: string; error?: string;
      };
      if (data.error) throw new Error(data.error);
      setAudioState("playing");
      if (data.useClientTTS) {
        playBrowser(data.text ?? chunkText, index);
      } else if (data.audio) {
        await playBuffer(data.audio, data.mimeType ?? "audio/mp3", index);
      }
    } catch (err) {
      console.error("TTS play error:", err);
      setAudioState("idle");
    }
  }, [voiceConfig, aiConfig, playBrowser, playBuffer]);

  const pause = useCallback(() => {
    cancelRaf();
    audioCtxRef.current?.suspend();
    if (typeof window !== "undefined") window.speechSynthesis?.pause();
    setAudioState("paused");
  }, [cancelRaf]);

  const resume = useCallback(() => {
    audioCtxRef.current?.resume();
    if (typeof window !== "undefined") window.speechSynthesis?.resume();
    // Restart RAF after resuming (AudioContext.currentTime resumes too, so delta stays correct)
    if (audioCtxRef.current && !isBrowserTTSRef.current) {
      const ctx = audioCtxRef.current;
      cancelRaf();
      const tick = () => {
        elapsedRef.current = ctx.currentTime - startTimeRef.current;
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    setAudioState("playing");
  }, [cancelRaf]);

  // Stable accessor functions — PassivePacer runs its own RAF and reads these
  const getDuration = useCallback(() => durationRef.current, []);
  const getElapsed = useCallback(() => elapsedRef.current, []);
  const getWordBoundaryIndex = useCallback(() => wordBoundaryIndexRef.current, []);
  const getIsBrowserTTS = useCallback(() => isBrowserTTSRef.current, []);

  return {
    audioState, setAudioState,
    play, pause, resume, stop,
    getDuration, getElapsed, getWordBoundaryIndex, getIsBrowserTTS,
  };
}
