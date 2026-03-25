import { headers } from "next/headers"
import { ConsolePage } from "@/components/console-page"

// Proxy console — OpenAI-compatible v0 Platform API adapter
export default async function Page() {
  const hdrs = await headers()
  const host = hdrs.get("host") ?? "localhost:3000"
  const proto = hdrs.get("x-forwarded-proto") ?? "http"
  const baseUrl = `${proto}://${host}`
  return <ConsolePage baseUrl={baseUrl} />
}
