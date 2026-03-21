"use client";

import React, { useState, useEffect } from "react";
import { PROVIDERS, getDefaultModel } from "@/lib/ai/providers";
import { loadAIConfig, saveAIConfig } from "@/lib/ai/config";
import type { AIConfig, AIProvider } from "@/lib/ai/types";
import type { VoiceConfig, OpenAIVoice, OpenAITTSModel, GeminiVoice, GrokVoice } from "@/types";
import { VOICE_CONFIG_KEY, DEFAULT_VOICE_CONFIG } from "@/types";
import { Button } from "@/components/ui/button";

interface Props { open: boolean; onClose: () => void; defaultTab?: "ai" | "voice" }

const OPENAI_VOICES: OpenAIVoice[] = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
const OPENAI_TTS_MODELS: { id: OpenAITTSModel; label: string }[] = [
  { id: "tts-1", label: "tts-1 (fast)" },
  { id: "tts-1-hd", label: "tts-1-hd (quality)" },
  { id: "gpt-4o-audio-preview", label: "gpt-4o-audio (natural)" },
];
const GEMINI_VOICES: GeminiVoice[] = ["Kore", "Puck", "Charon", "Fenrir", "Aoede"];
const GROK_VOICES: GrokVoice[] = ["ara", "eve", "leo", "rex", "sal"];

function loadVoiceConfig(): VoiceConfig {
  if (typeof window === "undefined") return DEFAULT_VOICE_CONFIG;
  try { return JSON.parse(localStorage.getItem(VOICE_CONFIG_KEY) ?? "null") ?? DEFAULT_VOICE_CONFIG; }
  catch { return DEFAULT_VOICE_CONFIG; }
}

export function loadVoiceConfigPublic(): VoiceConfig { return loadVoiceConfig(); }

export function SettingsModal({ open, onClose, defaultTab = "ai" }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig);
  const [voice, setVoice] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG);
  const [customModel, setCustomModel] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [tab, setTab] = useState<"ai" | "voice">(defaultTab);

  useEffect(() => {
    if (open) { setConfig(loadAIConfig()); setVoice(loadVoiceConfig()); setTestStatus("idle"); setTab(defaultTab); }
  }, [open]);

  if (!open) return null;

  const provider = PROVIDERS.find((p) => p.id === config.provider)!;
  const isOllama = config.provider === "ollama";

  function handleSave() {
    saveAIConfig({ ...config, model: customModel.trim() || config.model });
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(voice));
    onClose();
  }

  async function handleTest() {
    setTestStatus("loading"); setTestMessage("");
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig: { ...config, model: customModel.trim() || config.model } }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) { setTestStatus("ok"); setTestMessage("Connection successful!"); }
      else { setTestStatus("error"); setTestMessage(data.error ?? "Connection failed"); }
    } catch (e) { setTestStatus("error"); setTestMessage(e instanceof Error ? e.message : "Failed"); }
  }

  const cls = {
    input: "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300",
    label: "text-xs font-medium text-slate-700 dark:text-slate-300",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none">x</button>
        </div>
        <TabBar active={tab} onChange={setTab} />
        {tab === "ai" && (
          <AIPanel config={config} provider={provider} customModel={customModel} isOllama={isOllama}
            testStatus={testStatus} testMessage={testMessage}
            onProviderChange={(id) => { setConfig((p) => ({ ...p, provider: id as AIConfig["provider"], model: getDefaultModel(id) })); setCustomModel(""); setTestStatus("idle"); }}
            onModelChange={(m) => { setConfig((p) => ({ ...p, model: m })); setCustomModel(""); }}
            onCustomChange={setCustomModel}
            onApiKeyChange={(k) => setConfig((p) => ({ ...p, apiKey: k }))}
            onBaseUrlChange={(u) => setConfig((p) => ({ ...p, baseUrl: u }))}
            onTest={handleTest} cls={cls} />
        )}
        {tab === "voice" && (
          <VoicePanel voice={voice} onChange={setVoice} aiProvider={config.provider} cls={cls} />
        )}
        <Button onClick={handleSave} className="w-full">Save</Button>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }: { active: "ai" | "voice"; onChange: (t: "ai" | "voice") => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
      {(["ai", "voice"] as const).map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${active === t ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
          {t === "ai" ? "AI" : "Voice"}
        </button>
      ))}
    </div>
  );
}

function AIPanel({ config, provider, customModel, isOllama, testStatus, testMessage, onProviderChange, onModelChange, onCustomChange, onApiKeyChange, onBaseUrlChange, onTest, cls }: {
  config: AIConfig; provider: AIProvider; customModel: string; isOllama: boolean;
  testStatus: string; testMessage: string;
  onProviderChange: (id: string) => void; onModelChange: (m: string) => void;
  onCustomChange: (m: string) => void; onApiKeyChange: (k: string) => void; onBaseUrlChange: (u: string) => void;
  onTest: () => void; cls: { input: string; label: string };
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className={cls.label}>AI Provider</label>
        <select value={config.provider} onChange={(e) => onProviderChange(e.target.value)} className={cls.input}>
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className={cls.label}>Model</label>
        <select value={config.model} onChange={(e) => onModelChange(e.target.value)} className={cls.input}>
          {provider.models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.recommended ? " *" : ""}</option>)}
        </select>
        {isOllama && <input type="text" value={customModel} onChange={(e) => onCustomChange(e.target.value)} placeholder="Or type a custom model..." className={`${cls.input} mt-1`} />}
      </div>
      {provider.requiresApiKey && (
        <div className="space-y-1">
          <label className={cls.label}>API Key</label>
          <input type="password" value={config.apiKey ?? ""} onChange={(e) => onApiKeyChange(e.target.value)} placeholder={`Enter ${provider.name} API key`} className={cls.input} />
          <p className="text-xs text-slate-400 dark:text-slate-500">Stored in localStorage. Never sent to our servers.</p>
        </div>
      )}
      {isOllama && (
        <div className="space-y-1">
          <label className={cls.label}>Ollama Base URL</label>
          <input type="text" value={config.baseUrl ?? "http://localhost:11434"} onChange={(e) => onBaseUrlChange(e.target.value)} className={cls.input} />
        </div>
      )}
      {testStatus !== "idle" && (
        <p className={`text-xs ${testStatus === "ok" ? "text-green-600" : testStatus === "error" ? "text-red-600" : "text-slate-500"}`}>
          {testStatus === "loading" ? "Testing..." : testMessage}
        </p>
      )}
      <Button variant="outline" onClick={onTest} disabled={testStatus === "loading"} className="w-full">Test Connection</Button>
    </div>
  );
}

function VoicePanel({ voice, onChange, aiProvider, cls }: {
  voice: VoiceConfig; onChange: (v: VoiceConfig) => void;
  aiProvider: string; cls: { input: string; label: string };
}) {
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const load = () => setBrowserVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const usesBrowserTTS = aiProvider === "anthropic" || aiProvider === "ollama";

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Passive listen mode uses your <strong>{aiProvider}</strong> provider for audio.
      </p>
      {aiProvider === "openai" && (
        <>
          <div className="space-y-1">
            <label className={cls.label}>Voice</label>
            <select value={voice.openaiVoice ?? "alloy"} onChange={(e) => onChange({ ...voice, openaiVoice: e.target.value as OpenAIVoice })} className={cls.input}>
              {OPENAI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={cls.label}>TTS Model</label>
            <select value={voice.openaiTTSModel ?? "tts-1"} onChange={(e) => onChange({ ...voice, openaiTTSModel: e.target.value as OpenAITTSModel })} className={cls.input}>
              {OPENAI_TTS_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </>
      )}
      {aiProvider === "gemini" && (
        <div className="space-y-1">
          <label className={cls.label}>Voice</label>
          <select value={voice.geminiVoice ?? "Kore"} onChange={(e) => onChange({ ...voice, geminiVoice: e.target.value as GeminiVoice })} className={cls.input}>
            {GEMINI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}
      {aiProvider === "grok" && (
        <div className="space-y-1">
          <label className={cls.label}>Voice</label>
          <select value={voice.grokVoice ?? "eve"} onChange={(e) => onChange({ ...voice, grokVoice: e.target.value as GrokVoice })} className={cls.input}>
            {GROK_VOICES.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">5 expressive voices · 20+ languages · $4.20/1M chars</p>
        </div>
      )}
      {usesBrowserTTS && (
        <div className="space-y-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-500 dark:text-slate-400">
            {aiProvider} uses browser text-to-speech for passive mode.
          </div>
          {browserVoices.length > 0 && (
            <div className="space-y-1">
              <label className={cls.label}>Browser Voice</label>
              <select value={voice.browserVoiceURI ?? ""} onChange={(e) => onChange({ ...voice, browserVoiceURI: e.target.value })} className={cls.input}>
                <option value="">Default</option>
                {browserVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
