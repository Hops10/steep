export interface AIProvider {
  id: 'anthropic' | 'openai' | 'gemini' | 'grok' | 'ollama'
  name: string
  models: AIModel[]
  requiresApiKey: boolean
  baseUrl?: string
}

export interface AIModel {
  id: string
  name: string
  contextWindow: number
  recommended?: boolean
}

export interface AIConfig {
  provider: AIProvider['id']
  model: string
  apiKey?: string
  baseUrl?: string
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
}

export const AI_CONFIG_STORAGE_KEY = 'steep_ai_config'
