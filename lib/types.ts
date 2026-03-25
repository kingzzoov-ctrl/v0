// OpenAI-compatible request/response types
export interface OpenAIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface OpenAIChatRequest {
  model: string
  messages: OpenAIMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

export interface OpenAIChoice {
  index: number
  message: OpenAIMessage
  finish_reason: "stop" | "length" | null
}

export interface OpenAIStreamChoice {
  index: number
  delta: Partial<OpenAIMessage>
  finish_reason: "stop" | "length" | null
}

export interface OpenAIChatResponse {
  id: string
  object: "chat.completion"
  created: number
  model: string
  choices: OpenAIChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIStreamChunk {
  id: string
  object: "chat.completion.chunk"
  created: number
  model: string
  choices: OpenAIStreamChoice[]
}

// v0 Platform API types
export interface V0CreateChatResponse {
  id: string
  url: string
  title: string
}

export interface V0MessagePart {
  type: string
  text?: string
}

export interface V0Message {
  role: "user" | "assistant"
  content: V0MessagePart[] | string
}

export interface V0SendMessageResponse {
  id: string
  role: string
  parts: Array<{
    type: string
    text?: string
  }>
  text?: string
}
