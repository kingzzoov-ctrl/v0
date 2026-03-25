import { NextRequest } from "next/server"
import { getConfig, saveConfig, verifyAccessKey } from "@/lib/config-store"
import type { AppConfig } from "@/lib/config-store"

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) return false
  return verifyAccessKey(token)
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const cfg = getConfig()
  // Mask v0 API keys — show only last 6 chars
  const masked = {
    ...cfg,
    keys: cfg.keys.map((k) => ({
      ...k,
      key: k.key.length > 6 ? "..." + k.key.slice(-6) : k.key,
    })),
    // Access keys: mask similarly
    accessKeys: cfg.accessKeys.map((k) => ({
      ...k,
      key: k.key.length > 8 ? k.key.slice(0, 4) + "..." + k.key.slice(-4) : k.key,
    })),
  }
  return Response.json(masked)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: Partial<AppConfig>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  saveConfig(body)
  return Response.json({ ok: true })
}
