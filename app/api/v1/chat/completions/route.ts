import { NextRequest } from "next/server"
import type { OpenAIChatRequest, OpenAIChatResponse, OpenAIStreamChunk } from "@/lib/types"
import type { V0ModelMode } from "@/lib/config-store"
import { createChat, sendMessage, extractTextFromV0Response } from "@/lib/v0-client"
import {
  pickApiKey,
  reportKeyError,
  reportKeySuccess,
  getConfig,
  verifyAccessKey,
} from "@/lib/config-store"

/**
 * Map OpenAI-style model IDs to internal V0ModelMode.
 * If the model is a known alias, use it; otherwise fall back to the global config.
 */
function resolveModelMode(modelId: string | undefined, fallback: V0ModelMode): V0ModelMode {
  const map: Record<string, V0ModelMode> = {
    "v0-pro":      "pro",
    "v0-max":      "max",
    "v0-max-fast": "max-fast",
    "v0-fast":     "fast",
    // legacy aliases
    "v0-1.5-md":   "pro",
    "v0-1.5-lg":   "max",
    "v0-1.5-sm":   "fast",
    "v0":          "pro",
  }
  return modelId ? (map[modelId] ?? fallback) : fallback
}

export const maxDuration = 60

/**
 * OpenAI-compatible /v1/chat/completions
 *
 * Auth priority:
 *   1. If API keys are configured in the key pool, the pool key is used
 *      and the Authorization header acts as a "proxy access token" (can be anything non-empty).
 *   2. If no keys are in the pool, the Authorization header is used directly as the v0 API key.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? ""
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  if (!bearerToken) {
    return Response.json(
      { error: { message: "Missing Authorization header. Use: Bearer <your_access_key>", type: "auth_error" } },
      { status: 401 }
    )
  }

  // Verify against the service's own access key list.
  // If no access keys are configured the service is open (backwards-compatible).
  if (!verifyAccessKey(bearerToken)) {
    return Response.json(
      { error: { message: "Invalid access key. Check your Authorization header.", type: "auth_error" } },
      { status: 403 }
    )
  }

  let body: OpenAIChatRequest
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { message: "Invalid JSON body", type: "invalid_request_error" } },
      { status: 400 }
    )
  }

  const { model, messages, stream = false } = body

  if (!messages || messages.length === 0) {
    return Response.json(
      { error: { message: "messages array is required and must not be empty", type: "invalid_request_error" } },
      { status: 400 }
    )
  }

  // --- Resolve API key and config ---
  const cfg = getConfig()
  const poolKey = pickApiKey()
  const apiKey = poolKey ? poolKey.key : bearerToken
  const proxyUrl = cfg.proxy.enabled && cfg.proxy.url ? cfg.proxy.url : undefined
  // Per-request model override, or fall back to global config
  const modelMode = resolveModelMode(model, cfg.modelMode)

  // --- Determine chatId ---
  // A chatId is a long opaque string; known model aliases are NOT chatIds
  const KNOWN_MODELS = new Set(["v0-pro","v0-max","v0-max-fast","v0-fast","v0-1.5-md","v0-1.5-lg","v0-1.5-sm","v0","new"])
  let chatId: string
  const looksLikeChatId = model && !KNOWN_MODELS.has(model) && /^[a-zA-Z0-9_-]{8,}$/.test(model)

  try {
    if (looksLikeChatId) {
      chatId = model
    } else {
      const chat = await createChat(apiKey, proxyUrl)
      chatId = chat.id
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (poolKey) reportKeyError(poolKey.key)
    return Response.json(
      { error: { message, type: "upstream_error" } },
      { status: 502 }
    )
  }

  // --- Build prompt ---
  const systemMessages = messages.filter((m) => m.role === "system")
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")

  let prompt = ""
  if (systemMessages.length > 0) {
    prompt += systemMessages.map((m) => `[System]: ${m.content}`).join("\n") + "\n\n"
  }
  prompt += lastUserMessage ? lastUserMessage.content : messages[messages.length - 1].content

  const completionId = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const created = Math.floor(Date.now() / 1000)

  // --- Non-streaming ---
  if (!stream) {
    let v0Res: Response
    try {
      v0Res = await sendMessage(apiKey, chatId, prompt, false, modelMode, proxyUrl)
      if (poolKey) reportKeySuccess(poolKey.key)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (poolKey) reportKeyError(poolKey.key)
      return Response.json(
        { error: { message, type: "upstream_error" } },
        { status: 502 }
      )
    }

    const text = await extractTextFromV0Response(v0Res)

    const response: OpenAIChatResponse = {
      id: completionId,
      object: "chat.completion",
      created,
      model: chatId,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: prompt.length,
        completion_tokens: text.length,
        total_tokens: prompt.length + text.length,
      },
    }

    return Response.json(response)
  }

  // --- Streaming ---
  let v0Res: Response
  try {
    v0Res = await sendMessage(apiKey, chatId, prompt, true, modelMode, proxyUrl)
    if (poolKey) reportKeySuccess(poolKey.key)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (poolKey) reportKeyError(poolKey.key)
    return Response.json(
      { error: { message, type: "upstream_error" } },
      { status: 502 }
    )
  }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(chunk: OpenAIStreamChunk) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }

      function sendDone() {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      }

      try {
        const reader = v0Res.body?.getReader()
        if (!reader) throw new Error("No response body from v0")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data:")) continue

            const raw = trimmed.slice(5).trim()
            if (raw === "[DONE]") {
              send({
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model: chatId,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              })
              sendDone()
              controller.close()
              return
            }

            try {
              const parsed = JSON.parse(raw)
              const text: string =
                parsed?.text ??
                parsed?.delta?.text ??
                parsed?.parts?.find((p: { type: string }) => p.type === "text")?.text ??
                ""

              if (text) {
                send({
                  id: completionId,
                  object: "chat.completion.chunk",
                  created,
                  model: chatId,
                  choices: [
                    {
                      index: 0,
                      delta: { role: "assistant", content: text },
                      finish_reason: null,
                    },
                  ],
                })
              }
            } catch {
              // skip unparseable SSE lines
            }
          }
        }

        send({
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model: chatId,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        })
        sendDone()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: { message } })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
