import type { V0ModelMode } from "@/lib/config-store"

const V0_API_BASE = "https://api.v0.dev/v1"

/**
 * Build fetch RequestInit, injecting a SOCKS5 agent when a proxy URL is provided.
 * `socks-proxy-agent` is Node-only; the `agent` option is supported via undici
 * (Node 18+, which Next.js 16 uses internally).
 */
async function buildFetchOptions(
  apiKey: string,
  extra: RequestInit,
  proxyUrl?: string
): Promise<RequestInit> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(extra.headers as Record<string, string> | undefined),
  }

  const init: RequestInit & { dispatcher?: unknown } = {
    ...extra,
    headers,
  }

  if (proxyUrl) {
    try {
      // Dynamically import so it doesn't break edge runtimes if accidentally used there
      const { SocksProxyAgent } = await import("socks-proxy-agent")
      const agent = new SocksProxyAgent(proxyUrl)
      // undici (Node fetch) accepts `dispatcher`; for node-fetch compat we also try `agent`
      ;(init as Record<string, unknown>).agent = agent
      ;(init as Record<string, unknown>).dispatcher = agent
    } catch {
      // socks-proxy-agent not available or proxy URL invalid — proceed without proxy
    }
  }

  return init
}

/**
 * Map our model mode to the v0 API `model` field.
 *
 * v0 model tiers (from v0.dev/pricing):
 *   fast     → v0-1.5-sm  — Lightning-fast, near-frontier ($1/$5 per 1M in/out)
 *   pro      → v0-1.5-md  — Balanced speed & intelligence ($3/$15 per 1M in/out)
 *   max      → v0-1.5-lg  — Maximum intelligence ($5/$25 per 1M in/out)
 *   max-fast → v0-1.5-lg  — Max intelligence + 2.5x faster ($30/$150 per 1M in/out)
 */
function modeToV0Model(mode: V0ModelMode): string {
  switch (mode) {
    case "fast":
      return "v0-1.5-sm"
    case "pro":
      return "v0-1.5-md"
    case "max":
      return "v0-1.5-lg"
    case "max-fast":
      return "v0-1.5-lg"
    default:
      return "v0-1.5-md"
  }
}

/**
 * Max Fast uses the same model as Max but with streaming speed optimization.
 */
function isMaxFast(mode: V0ModelMode): boolean {
  return mode === "max-fast"
}

export async function createChat(
  apiKey: string,
  proxyUrl?: string
): Promise<{ id: string; url: string }> {
  const opts = await buildFetchOptions(apiKey, { method: "POST", body: JSON.stringify({}) }, proxyUrl)
  const res = await fetch(`${V0_API_BASE}/chats`, opts)

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`v0 createChat failed (${res.status}): ${err}`)
  }

  return res.json()
}

export async function sendMessage(
  apiKey: string,
  chatId: string,
  message: string,
  stream: boolean,
  modelMode: V0ModelMode = "auto",
  proxyUrl?: string
): Promise<Response> {
  const opts = await buildFetchOptions(
    apiKey,
    {
      method: "POST",
      headers: {
        Accept: stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify({
        message,
        stream,
        model: modeToV0Model(modelMode),
        ...(isMaxFast(modelMode) ? { turbo: true } : {}),
      }),
    },
    proxyUrl
  )

  const res = await fetch(`${V0_API_BASE}/chats/${chatId}/messages`, opts)

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`v0 sendMessage failed (${res.status}): ${err}`)
  }

  return res
}

export async function extractTextFromV0Response(res: Response): Promise<string> {
  const data = await res.json()
  if (typeof data.text === "string") return data.text
  if (Array.isArray(data.parts)) {
    return data.parts
      .filter((p: { type: string; text?: string }) => p.type === "text" && p.text)
      .map((p: { type: string; text?: string }) => p.text)
      .join("")
  }
  return JSON.stringify(data)
}
