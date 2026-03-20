import type { AIProvider } from './types'

export const PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    requiresApiKey: true,
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000, recommended: true },
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', contextWindow: 200000 },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    requiresApiKey: true,
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 128000, recommended: true },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 128000 },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    requiresApiKey: true,
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1000000, recommended: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
    ],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    requiresApiKey: true,
    models: [
      { id: 'grok-3', name: 'Grok 3', contextWindow: 131072, recommended: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', contextWindow: 131072 },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    requiresApiKey: false,
    baseUrl: 'http://localhost:11434',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 128000, recommended: true },
      { id: 'mistral', name: 'Mistral', contextWindow: 32000 },
      { id: 'qwen2.5', name: 'Qwen 2.5', contextWindow: 128000 },
      { id: 'phi4', name: 'Phi-4', contextWindow: 16000 },
      { id: 'gemma3', name: 'Gemma 3', contextWindow: 128000 },
    ],
  },
]

export function getProvider(id: string): AIProvider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function getDefaultModel(providerId: string): string {
  const provider = getProvider(providerId)
  const recommended = provider?.models.find((m) => m.recommended)
  return recommended?.id ?? provider?.models[0]?.id ?? ''
}
