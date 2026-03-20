'use client'

import React, { useState, useEffect } from 'react'
import { PROVIDERS, getDefaultModel } from '@/lib/ai/providers'
import { loadAIConfig, saveAIConfig } from '@/lib/ai/config'
import { callAI } from '@/lib/ai/client'
import type { AIConfig, AIProvider } from '@/lib/ai/types'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig)
  const [customModel, setCustomModel] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    if (open) {
      const loaded = loadAIConfig()
      setConfig(loaded)
      setTestStatus('idle')
    }
  }, [open])

  if (!open) return null

  const provider = PROVIDERS.find((p) => p.id === config.provider)!
  const isOllama = config.provider === 'ollama'

  function handleProviderChange(id: string) {
    const defaultModel = getDefaultModel(id)
    setConfig((prev) => ({ ...prev, provider: id as AIConfig['provider'], model: defaultModel }))
    setCustomModel('')
    setTestStatus('idle')
  }

  function handleModelChange(model: string) {
    setConfig((prev) => ({ ...prev, model }))
    setCustomModel('')
  }

  function handleSave() {
    const finalConfig = { ...config, model: customModel.trim() || config.model }
    saveAIConfig(finalConfig)
    onClose()
  }

  async function handleTestConnection() {
    setTestStatus('loading')
    setTestMessage('')
    try {
      const finalConfig = { ...config, model: customModel.trim() || config.model }
      await callAI(finalConfig, 'You are a test assistant.', 'Reply with only "OK".')
      setTestStatus('ok')
      setTestMessage('Connection successful!')
    } catch (e) {
      setTestStatus('error')
      setTestMessage(e instanceof Error ? e.message : 'Connection failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">AI Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <ProviderSelector
          current={config.provider}
          onChange={handleProviderChange}
        />

        <ModelSelector
          provider={provider}
          current={config.model}
          customModel={customModel}
          onModelChange={handleModelChange}
          onCustomChange={setCustomModel}
          isOllama={isOllama}
        />

        {provider.requiresApiKey && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">API Key</label>
            <input
              type="password"
              value={config.apiKey ?? ''}
              onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
              placeholder={`Enter ${provider.name} API key`}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <p className="text-xs text-slate-400">Stored in localStorage. Never sent to our servers.</p>
          </div>
        )}

        {isOllama && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Ollama Base URL</label>
            <input
              type="text"
              value={config.baseUrl ?? 'http://localhost:11434'}
              onChange={(e) => setConfig((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="http://localhost:11434"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        )}

        {testStatus !== 'idle' && (
          <p className={`text-xs ${testStatus === 'ok' ? 'text-green-600' : testStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
            {testStatus === 'loading' ? 'Testing connection…' : testMessage}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={handleTestConnection} disabled={testStatus === 'loading'} className="flex-1">
            Test Connection
          </Button>
          <Button onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  )
}

function ProviderSelector({ current, onChange }: { current: string; onChange: (id: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">AI Provider</label>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  )
}

function ModelSelector({ provider, current, customModel, onModelChange, onCustomChange, isOllama }: {
  provider: AIProvider
  current: string
  customModel: string
  onModelChange: (m: string) => void
  onCustomChange: (m: string) => void
  isOllama: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">Model</label>
      <select
        value={current}
        onChange={(e) => onModelChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        {provider.models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}{m.recommended ? ' ★' : ''}</option>
        ))}
      </select>
      {isOllama && (
        <input
          type="text"
          value={customModel}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Or type a custom model name…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mt-1"
        />
      )}
    </div>
  )
}
