"use client"

import { CopyButton } from "@/components/copy-button"

interface EndpointCardProps {
  baseUrl: string
}

export function EndpointCard({ baseUrl }: EndpointCardProps) {
  const endpoint = `${baseUrl}/api/v1/chat/completions`
  const modelsUrl = `${baseUrl}/api/v1/models`

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">API 端点</h2>
        <p className="text-xs text-muted-foreground mt-0.5">在 OpenClaw 或任何 OpenAI 兼容客户端中填写以下地址</p>
      </div>
      <div className="divide-y divide-border">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Base URL</p>
            <p className="text-sm font-mono text-primary truncate">{baseUrl}/api</p>
          </div>
          <CopyButton value={`${baseUrl}/api`} />
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Chat Completions</p>
            <p className="text-sm font-mono text-foreground/80 truncate">{endpoint}</p>
          </div>
          <CopyButton value={endpoint} />
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Models</p>
            <p className="text-sm font-mono text-foreground/80 truncate">{modelsUrl}</p>
          </div>
          <CopyButton value={modelsUrl} />
        </div>
      </div>
    </div>
  )
}
