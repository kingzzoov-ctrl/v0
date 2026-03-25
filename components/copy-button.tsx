"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="复制到剪贴板"
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-secondary",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="size-3 text-[var(--success)]" />
          <span className="text-[var(--success)]">已复制</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>复制</span>
        </>
      )}
    </button>
  )
}
