import { CodeBlock } from "@/components/code-block"

interface IntegrationGuideProps {
  baseUrl: string
}

export function IntegrationGuide({ baseUrl }: IntegrationGuideProps) {
  const curlExample = `curl ${baseUrl}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <你的_v0_api_key>" \\
  -d '{
    "model": "v0",
    "messages": [
      {"role": "user", "content": "帮我写一个 React 登录组件"}
    ]
  }'`

  const curlStream = `curl ${baseUrl}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <你的_v0_api_key>" \\
  -d '{
    "model": "v0",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'`

  const pythonExample = `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/api/v1",
    api_key="<你的_v0_api_key>",   # 填写你的 v0 API Key
)

response = client.chat.completions.create(
    model="v0",
    messages=[
        {"role": "user", "content": "帮我写一个 Next.js 登录页面"}
    ]
)

print(response.choices[0].message.content)`

  const openClawConfig = `# 在 OpenClaw 的 HTTP 请求节点中填写：

Method   : POST
URL      : ${baseUrl}/api/v1/chat/completions
Headers  :
  Content-Type  : application/json
  Authorization : Bearer <你的_v0_api_key>

Body (JSON):
{
  "model": "v0",
  "messages": [
    {"role": "user", "content": "{{input}}"}
  ]
}

# 响应路径（获取回答文本）:
$.choices[0].message.content`

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">OpenClaw 接入配置</h2>
          <p className="text-xs text-muted-foreground mt-0.5">在 HTTP 请求节点中按以下方式配置</p>
        </div>
        <div className="p-5">
          <CodeBlock code={openClawConfig} language="yaml" title="OpenClaw HTTP 节点" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">认证方式</h2>
          <p className="text-xs text-muted-foreground mt-0.5">使用你的 v0 API Key 作为 Bearer Token</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-md bg-secondary/60 border border-border">
            <div className="mt-0.5 size-1.5 rounded-full bg-[var(--success)] shrink-0 mt-2" />
            <div>
              <p className="text-xs font-medium text-foreground">Authorization Header</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {'Authorization: Bearer <你的_v0_api_key>'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            前往{" "}
            <a
              href="https://v0.dev/chat/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              v0.dev/chat/settings/keys
            </a>{" "}
            获取 API Key。
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">cURL 测试（普通）</h2>
          </div>
          <div className="p-5">
            <CodeBlock code={curlExample} language="bash" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">cURL 测试（流式）</h2>
          </div>
          <div className="p-5">
            <CodeBlock code={curlStream} language="bash" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Python OpenAI SDK 接入示例</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{"只需替换 base_url 和 api_key，无需修改其他代码"}</p>
        </div>
        <div className="p-5">
          <CodeBlock code={pythonExample} language="python" />
        </div>
      </div>
    </div>
  )
}
