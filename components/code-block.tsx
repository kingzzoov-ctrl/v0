import { CopyButton } from "@/components/copy-button"

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
}

export function CodeBlock({ code, language = "bash", title }: CodeBlockProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs text-muted-foreground font-mono">{title}</span>
          )}
          <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">{language}</span>
        </div>
        <CopyButton value={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed bg-card text-foreground/90 scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  )
}
