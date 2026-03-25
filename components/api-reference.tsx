interface Param {
  name: string
  type: string
  required: boolean
  description: string
}

const requestParams: Param[] = [
  { name: "model", type: "string", required: true, description: '填 "v0" 每次创建新 chat；或填已有的 v0 chatId 继续上下文' },
  { name: "messages", type: "array", required: true, description: "消息数组，支持 system / user / assistant 角色" },
  { name: "stream", type: "boolean", required: false, description: "是否启用 SSE 流式输出，默认 false" },
  { name: "temperature", type: "number", required: false, description: "已接收但转发给 v0 时忽略（v0 API 不支持）" },
  { name: "max_tokens", type: "number", required: false, description: "已接收但转发给 v0 时忽略（v0 API 不支持）" },
]

const responseFields: Param[] = [
  { name: "id", type: "string", required: true, description: "形如 chatcmpl-{timestamp}-{random}" },
  { name: "object", type: "string", required: true, description: '"chat.completion" 或 "chat.completion.chunk"（流式）' },
  { name: "model", type: "string", required: true, description: "实际使用的 v0 chatId" },
  { name: "choices[].message.content", type: "string", required: true, description: "v0 返回的完整回答文本" },
  { name: "usage", type: "object", required: false, description: "基于字符长度估算的 token 用量（非精确值）" },
]

function ParamTable({ params, title }: { params: Param[]; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground w-44">字段</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">类型</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">必填</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {params.map((p) => (
              <tr key={p.name} className="hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-mono text-primary">{p.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{p.type}</td>
                <td className="px-4 py-3">
                  {p.required ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/15 text-primary">
                      必填
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground">
                      可选
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground/75 leading-relaxed">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ApiReference() {
  return (
    <div className="space-y-4">
      <ParamTable params={requestParams} title="请求参数（Request Body）" />
      <ParamTable params={responseFields} title="响应字段（Response）" />

      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">关于 model 字段</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            v0 Platform API 采用 Chat 会话模式，每条消息都绑定在一个 chatId 下。
            本代理将 <span className="font-mono text-foreground/80">model</span> 字段映射为 chatId：
          </p>
          <ul className="space-y-1.5 pl-4 list-disc">
            <li>
              填 <span className="font-mono text-primary">"v0"</span>（或任何不像 chatId 的值）
              → 每次请求自动创建新 chat，适合无状态场景
            </li>
            <li>
              填具体的 <span className="font-mono text-primary">chatId</span>（8位以上字母数字）
              → 复用已有 chat，上下文持续累积
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
