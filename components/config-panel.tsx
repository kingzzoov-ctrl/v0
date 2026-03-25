"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { V0ModelMode, ApiKeyEntry, AccessKeyEntry, ProxyConfig } from "@/lib/config-store"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ConfigState {
  keys: (ApiKeyEntry & { rawKey?: string })[]
  accessKeys: (AccessKeyEntry & { rawKey?: string })[]
  proxy: ProxyConfig
  modelMode: V0ModelMode
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const MODEL_MODES: { value: V0ModelMode; label: string; sub: string; desc: string; price: string }[] = [
  {
    value: "pro",
    label: "Pro",
    sub: "v0-1.5-md",
    desc: "均衡速度与智能，适合绝大多数任务",
    price: "$3 / $15",
  },
  {
    value: "max",
    label: "Max",
    sub: "v0-1.5-lg",
    desc: "最高智能，适合复杂推理与大型项目",
    price: "$5 / $25",
  },
  {
    value: "max-fast",
    label: "Max Fast",
    sub: "v0-1.5-lg · 2.5x 加速",
    desc: "Max 同等智能，输出速度提升 2.5 倍",
    price: "$30 / $150",
  },
  {
    value: "fast",
    label: "Fast",
    sub: "v0-1.5-sm",
    desc: "极速响应，接近前沿能力，适合简单任务",
    price: "$1 / $5",
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full shrink-0",
        ok ? "bg-[var(--success)]" : "bg-destructive"
      )}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function ConfigPanel() {
  const [config, setConfig] = useState<ConfigState>({
    keys: [],
    accessKeys: [],
    proxy: { enabled: false, url: "" },
    modelMode: "pro",
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [newAccessKey, setNewAccessKey] = useState("")
  const [newAccessLabel, setNewAccessLabel] = useState("")
  const [masterKey, setMasterKey] = useState("")

  // ── Load ──
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/config", {
        headers: masterKey ? { Authorization: `Bearer ${masterKey}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      } else if (res.status === 401) {
        // If access keys are configured we need the user to enter one
        // Show a prompt in the UI
      }
    } catch {
      // ignore
    }
  }, [masterKey])

  useEffect(() => {
    load()
  }, [load])

  // ── Save ──
  const save = async (patch: Partial<ConfigState>) => {
    setSaving(true)
    setSavedMsg("")
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(masterKey ? { Authorization: `Bearer ${masterKey}` } : {}),
        },
        body: JSON.stringify(patch),
      })
      if (res.status === 401) {
        setSavedMsg("需要管理员 Key")
      } else {
        setSavedMsg("已保存")
        setTimeout(() => setSavedMsg(""), 2000)
        await load()
      }
    } catch {
      setSavedMsg("保存失败")
    } finally {
      setSaving(false)
    }
  }

  // ── Access keys ──
  const addAccessKey = async () => {
    const trimmed = newAccessKey.trim()
    if (!trimmed) return
    const entry: AccessKeyEntry = {
      key: trimmed,
      label: newAccessLabel.trim() || `访问Key ${config.accessKeys.length + 1}`,
      enabled: true,
      createdAt: Date.now(),
    }
    await save({ accessKeys: [...config.accessKeys, entry] })
    setNewAccessKey("")
    setNewAccessLabel("")
  }

  const removeAccessKey = async (idx: number) => {
    await save({ accessKeys: config.accessKeys.filter((_, i) => i !== idx) })
  }

  const toggleAccessKey = async (idx: number) => {
    await save({
      accessKeys: config.accessKeys.map((k, i) =>
        i === idx ? { ...k, enabled: !k.enabled } : k
      ),
    })
  }

  // ── v0 Key pool ──
  const addKey = async () => {
    const trimmed = newKey.trim()
    if (!trimmed) return
    const entry: ApiKeyEntry = {
      key: trimmed,
      label: newKeyLabel.trim() || `Key ${config.keys.length + 1}`,
      errorCount: 0,
      enabled: true,
    }
    const updated = [...config.keys, { ...entry, rawKey: trimmed }]
    await save({ keys: updated })
    setNewKey("")
    setNewKeyLabel("")
  }

  const removeKey = async (idx: number) => {
    const updated = config.keys.filter((_, i) => i !== idx)
    await save({ keys: updated })
  }

  const toggleKey = async (idx: number) => {
    const updated = config.keys.map((k, i) =>
      i === idx ? { ...k, enabled: !k.enabled } : k
    )
    await save({ keys: updated })
  }

  return (
    <div className="space-y-6">

      {/* ── Admin Auth ── */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">管理员 Key</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            配置了访问控制后，修改配置需要提供任意一个有效的访问 Key
          </p>
        </div>
        <div className="p-5 flex gap-2">
          <input
            type="password"
            placeholder="输入访问 Key 以解锁配置操作..."
            value={masterKey}
            onChange={(e) => setMasterKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={load}
            className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-border transition-colors shrink-0"
          >
            验证
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-muted-foreground">
          未设置访问 Key 时服务为开放模式，任何人都可以使用你的代理端点
        </p>
      </section>

      {/* ── Access Control ── */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">访问控制 Key</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            添加后，调用方必须在请求头中携带 <code className="font-mono bg-secondary px-1 rounded">Authorization: Bearer &lt;key&gt;</code> 才能使用本代理
          </p>
        </div>

        <div className="divide-y divide-border">
          {config.accessKeys.length === 0 && (
            <div className="px-5 py-6 text-center text-xs text-muted-foreground">
              暂无访问 Key — 当前为开放模式，任何人均可调用
            </div>
          )}
          {config.accessKeys.map((k, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <StatusDot ok={k.enabled} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate">{k.label}</span>
                  {!k.enabled && (
                    <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                      已禁用
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{k.key}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleAccessKey(i)}
                  className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {k.enabled ? "禁用" : "启用"}
                </button>
                <button
                  onClick={() => removeAccessKey(i)}
                  className="rounded px-2 py-1 text-[11px] text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="备注名称（可选）"
              value={newAccessLabel}
              onChange={(e) => setNewAccessLabel(e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36 shrink-0"
            />
            <input
              type="text"
              placeholder="自定义密钥，例如 sk-my-secret-token"
              value={newAccessKey}
              onChange={(e) => setNewAccessKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAccessKey()}
              className="flex-1 min-w-0 rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={addAccessKey}
              disabled={saving || !newAccessKey.trim()}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
            >
              添加
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            在 OpenClaw 的 HTTP 节点中填写此 Key 作为 Authorization Bearer Token
          </p>
        </div>
      </section>

      {/* ── Model Mode ── */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">v0 模型模式</h2>
            <p className="text-xs text-muted-foreground mt-0.5">选择发送到 v0 API 的底层模型</p>
          </div>
          {savedMsg && (
            <span className="text-xs text-[var(--success)]">{savedMsg}</span>
          )}
        </div>
        <div className="p-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MODEL_MODES.map((m) => {
            const active = config.modelMode === m.value
            return (
              <button
                key={m.value}
                onClick={() => save({ modelMode: m.value })}
                className={cn(
                  "rounded-md border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "size-2 rounded-full border-2 shrink-0",
                      active ? "border-primary bg-primary" : "border-muted-foreground"
                    )}
                  />
                  <span className="text-xs font-semibold">{m.label}</span>
                </div>
                <p className="text-[10px] text-primary/70 font-mono pl-4 mb-1">{m.sub}</p>
                <p className="text-[11px] text-muted-foreground pl-4 leading-relaxed">{m.desc}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono pl-4 mt-1.5">
                  输入/输出 {m.price} /1M tokens
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── API Key Pool ── */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">API Key 池</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            配置多个 Key 实现轮询，额度耗尽后自动切换到下一个 Key
          </p>
        </div>

        {/* Key list */}
        <div className="divide-y divide-border">
          {config.keys.length === 0 && (
            <div className="px-5 py-6 text-center text-xs text-muted-foreground">
              暂无 Key，添加后代理将优先使用 Key 池，否则使用请求的 Authorization 头
            </div>
          )}
          {config.keys.map((k, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <StatusDot ok={k.enabled && (k.errorCount ?? 0) < 3} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {k.label}
                  </span>
                  {!k.enabled && (
                    <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                      已禁用
                    </span>
                  )}
                  {(k.errorCount ?? 0) >= 3 && k.enabled && (
                    <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] text-yellow-400">
                      额度冷却中
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {k.key}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleKey(i)}
                  className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {k.enabled ? "禁用" : "启用"}
                </button>
                <button
                  onClick={() => removeKey(i)}
                  className="rounded px-2 py-1 text-[11px] text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add key form */}
        <div className="px-5 py-4 border-t border-border bg-secondary/20">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="备注名称（可选）"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36 shrink-0"
            />
            <input
              type="password"
              placeholder="v0_xxxxxxxxxxxx"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKey()}
              className="flex-1 min-w-0 rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={addKey}
              disabled={saving || !newKey.trim()}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
            >
              添加
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            前往{" "}
            <a
              href="https://v0.dev/chat/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              v0.dev/chat/settings/keys
            </a>{" "}
            获取 API Key · Key 池为空时，使用请求 Authorization 头中的 Key
          </p>
        </div>
      </section>

      {/* ── SOCKS5 Proxy ── */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">SOCKS5 代理</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                配置出站代理，规避单 IP 请求限制
              </p>
            </div>
            <button
              onClick={() =>
                save({ proxy: { ...config.proxy, enabled: !config.proxy.enabled } })
              }
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors shrink-0",
                config.proxy.enabled ? "bg-primary" : "bg-border"
              )}
              role="switch"
              aria-checked={config.proxy.enabled}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                  config.proxy.enabled ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>
        <div className={cn("p-5 space-y-3", !config.proxy.enabled && "opacity-50 pointer-events-none")}>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="socks5://user:pass@127.0.0.1:1080"
              value={config.proxy.url}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  proxy: { ...prev.proxy, url: e.target.value },
                }))
              }
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => save({ proxy: config.proxy })}
              disabled={saving}
              className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-border transition-colors disabled:opacity-40 shrink-0"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 divide-y divide-border text-[11px] font-mono text-muted-foreground overflow-hidden">
            {[
              "socks5://127.0.0.1:1080",
              "socks5://user:pass@proxy.example.com:1080",
              "socks5h://127.0.0.1:7890   # h = DNS 也走代理",
            ].map((ex) => (
              <div key={ex} className="px-3 py-2">
                {ex}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
