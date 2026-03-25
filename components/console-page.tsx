"use client"

import { useState } from "react"
import { EndpointCard } from "@/components/endpoint-card"
import { IntegrationGuide } from "@/components/integration-guide"
import { ApiReference } from "@/components/api-reference"
import { ConfigPanel } from "@/components/config-panel"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "config", label: "配置" },
  { id: "guide", label: "接入指南" },
  { id: "reference", label: "API 参考" },
] as const

type TabId = (typeof TABS)[number]["id"]

interface ConsolePageProps {
  baseUrl: string
}

export function ConsolePage({ baseUrl }: ConsolePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("config")

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 5V11M5 6.5L8 5L11 6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">v0 OpenAI 兼容代理</span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
              运行中
            </span>
          </div>
          <a
            href="https://v0.dev/docs/api/platform/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            v0 Platform 文档 ↗
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="rounded-lg border border-border bg-gradient-to-b from-primary/5 to-transparent p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-foreground text-balance">
                v0 → OpenAI 兼容代理
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty max-w-xl">
                将 v0 Platform API 包装成标准 OpenAI 格式，无需修改客户端代码即可接入 OpenClaw、Dify、FastGPT 等平台。
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-1.5 font-mono">
                <span className="size-1.5 rounded-full bg-[var(--success)]" />
                POST /api/v1/chat/completions
              </span>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="mt-5 flex items-center gap-2 text-xs flex-wrap">
            {[
              { label: "OpenClaw / 客户端", color: "bg-secondary border-border" },
              { arrow: true },
              { label: "本代理 /api/v1/...", color: "bg-primary/10 border-primary/30 text-primary" },
              { arrow: true },
              { label: "api.v0.dev /v1/...", color: "bg-secondary border-border" },
            ].map((item, i) =>
              "arrow" in item ? (
                <svg key={i} className="size-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span
                  key={i}
                  className={cn("rounded border px-2.5 py-1.5 font-mono whitespace-nowrap", item.color)}
                >
                  {item.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Endpoint */}
        <EndpointCard baseUrl={baseUrl} />

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-border mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm transition-colors relative",
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
                )}
              </button>
            ))}
          </div>

          {activeTab === "config" && <ConfigPanel />}
          {activeTab === "guide" && <IntegrationGuide baseUrl={baseUrl} />}
          {activeTab === "reference" && <ApiReference />}
        </div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>v0 OpenAI 兼容代理</span>
          <span>基于 v0 Platform API · Next.js 16</span>
        </div>
      </footer>
    </div>
  )
}
