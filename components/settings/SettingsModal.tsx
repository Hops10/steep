'use client'

import React, { useState, useEffect } from 'react'
import { PROVIDERS, getDefaultModel } from '@/lib/ai/providers'
import { loadAIConfig, saveAIConfig } from '@/lib/ai/config'
import type { AIConfig, AIProvider } from '@/lib/ai/types'
import type { VoiceConfig, VoiceProvider } from '@/types'
import { VOICE_CONFIG_KEY, DEFAULT_VOICE_CONFIG } from '@/types'
import { Button } from '@/components/ui/button'

interface Props { open: boolean; onClose: () => void }

const VOICE_PROVIDERS: { id: VoiceProvider; label: string; needsKey: boolean }[] = [
  { id: 'browser', label: 'Browser (free, no key)', needsKey: false },
  { id: 'openai', label: 'OpenAI TTS', needsKey: true },
  { id: 'gemini', label: 'Gemini TTS', needsKey: true },
]
const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
const OPENAI_MODELS = [{ id: 'tts-1', name: 'tts-1 (fast)' }, { id: 'tts-1-hd', name: 'tts-1-hd (quality)' }]

function loadVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined') return DEFAULT_VOICE_CONFIG
  try { return JSON.parse(localStorage.getItem(VOICE_CONFIG_KEY) ?? 'null') ?? DEFAULT_VOICE_CONFIG }
  catch { return DEFAULT_VOICE_CONFIG }
}

export function SettingsModal({ open, onClose }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig)
  const [voice, setVoice] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG)
  const [customModel, setCustomModel] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [tab, setTab] = useState<'ai' | 'voice'>('ai')

  useEffect(() => {
    if (open) { setConfig(loadAIConfig()); setVoice(loadVoiceConfig()); setTestStatus('idle') }
  }, [open])

  if (!open) return null

  const provider = PROVIDERS.find((p) => p.id === config.provider)!
  const isOllama = config.provider === 'ollama'

  function handleProviderChange(id: string) {
    setConfig((prev) => ({ ...prev, provider: id as AIConfig['provider'], model: getDefaultModel(id) }))
    setCustomModel(''); setTestStatus('idle')
  }

  function handleSave() {
    saveAIConfig({ ...config, model: customModel.trim() || config.model })
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(voice))
    onClose()
  }

  async function handleTestConnection() {
    setTestStatus('loading'); setTestMessage('')
    try {
      const res = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aiConfig: { ...config, model: customModel.trim() || config.model } }) })
      const data = await res.json()
      if (data.success) { setTestStatus('ok'); setTestMessage('Connection successful!') }
      else { setTestStatus('error'); setTestMessage(data.error ?? 'Connection failed') }
    } catch (e) { setTestStatus('error'); setTestMessage(e instanceof Error ? e.message : 'Connection failed') }
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500'
  const labelCls = 'text-xs font-medium text-slate-700 dark:text-slate-300'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none">×</button>
        </div>

        <TabBar active={tab} onChange={setTab} />

        {tab === 'ai' && (
          <AISettingsPanel
            config={config} provider={provider} customModel={customModel} isOllama={isOllama}
            testStatus={testStatus} testMessage={testMessage}
            onProviderChange={handleProviderChange}
            onModelChange={(m) => { setConfig((p) => ({ ...p, model: m })); setCustomModel('') }}
            onCustomChange={setCustomModel}
            onApiKeyChange={(k) => setConfig((p) => ({ ...p, apiKey: k }))}
            onBaseUrlChange={(u) => setConfig((p) => ({ ...p, baseUrl: u }))}
            onTest={handleTestConnection}
            inputCls={inputCls} labelCls={labelCls}
          />
        )}

        {tab === 'voice' && (
          <VoiceSettingsPanel voice={voice} onChange={setVoice} inputCls={inputCls} labelCls={labelCls} />
        )}

        <Button onClick={handleSave} className="w-full">Save</Button>
      </div>
    </div>
  )
}

function TabBar({ active, onChange }: { active: 'ai' | 'voice'; onChange: (t: 'ai' | 'voice') => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
      {(['ai', 'voice'] as const).map((t) => (
        <button key={t} onClick={() => onChange(t)} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${active === t ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          {t === 'ai' ? '🤖 AI' : '🎙️ Voice'}
        </button>
      ))}
    </div>
  )
}

function AISettingsPanel({ config, provider, customModel, isOllama, testStatus, testMessage, onProviderChange, onModelChange, onCustomChange, onApiKeyChange, onBaseUrlChange, onTest, inputCls, labelCls }: {
  config: AIConfig; provider: AIProvider; customModel: string; isOllama: boolean
  testStatus: string; testMessage: string
  onProviderChange: (id: string) => void; onModelChange: (m: string) => void
  onCustomChange: (m: string) => void; onApiKeyChange: (k: string) => void; onBaseUrlChange: (u: string) => void
  onTest: () => void; inputCls: string; labelCls: string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className={labelCls}>AI Provider</label>
        <select value={config.provider} onChange={(e) => onProviderChange(e.target.value)} className={inputCls}>
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Model</label>
        <select value={config.model} onChange={(e) => onModelChange(e.target.value)} className={inputCls}>
          {provider.models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.recommended ? ' ★' : ''}</option>)}
        </select>
        {isOllama && <input type="text" value={customModel} onChange={(e) => onCustomChange(e.target.value)} placeholder="Or type a custom model name…" className={`${inputCls} mt-1`} />}
      </div>
      {provider.requiresApiKey && (
        <div className="space-y-1">
          <label className={labelCls}>API Key</label>
          <input type="password" value={config.apiKey ?? ''} onChange={(e) => onApiKeyChange(e.target.value)} placeholder={`Enter ${provider.name} API key`} className={inputCls} />
          <p className="text-xs text-slate-400 dark:text-slate-500">Stored in localStorage. Never sent to our servers.</p>
        </div>
      )}
      {isOllama && <div className="space-y-1"><label className={labelCls}>Ollama Base URL</label><input type="text" value={config.baseUrl ?? 'http://localhost:11434'} onChange={(e) => onBaseUrlChange(e.target.value)} className={inputCls} /></div>}
      {testStatus !== 'idle' && <p className={`text-xs ${testStatus === 'ok' ? 'text-green-600 dark:text-green-400' : testStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{testStatus === 'loading' ? 'Testing connection…' : testMessage}</p>}
      <Button variant="outline" onClick={onTest} disabled={testStatus === 'loading'} className="w-full">Test Connection</Button>
    </div>
  )
}

function VoiceSettingsPanel({ voice, onChange, inputCls, labelCls }: {
  voice: VoiceConfig; onChange: (v: VoiceConfig) => void; inputCls: string; labelCls: string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className={labelCls}>TTS Provider</label>
        <select value={voice.provider} onChange={(e) => onChange({ ...voice, provider: e.target.value as VoiceProvider })} className={inputCls}>
          {VOICE_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      {voice.provider === 'openai' && (
        <>
          <div className="space-y-1">
            <label className={labelCls}>OpenAI API Key</label>
            <input type="password" value={voice.apiKey ?? ''} onChange={(e) => onChange({ ...voice, apiKey: e.target.value })} placeholder="sk-..." className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Voice</label>
            <select value={voice.voice ?? 'alloy'} onChange={(e) => onChange({ ...voice, voice: e.target.value })} className={inputCls}>
              {OPENAI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Model</label>
            <select value={voice.model ?? 'tts-1'} onChange={(e) => onChange({ ...voice, model: e.target.value })} className={inputCls}>
              {OPENAI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </>
      )}
      {voice.provider === 'gemini' && (
        <div className="space-y-1">
          <label className={labelCls}>Gemini API Key</label>
          <input type="password" value={voice.apiKey ?? ''} onChange={(e) => onChange({ ...voice, apiKey: e.target.value })} placeholder="AIza..." className={inputCls} />
        </div>
      )}
      {voice.provider === 'browser' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Uses your browser&apos;s built-in text-to-speech. No API key needed.</p>
      )}
    </div>
  )
}
