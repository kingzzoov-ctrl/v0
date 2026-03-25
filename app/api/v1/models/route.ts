/**
 * OpenAI-compatible GET /v1/models
 * Maps v0 pricing tiers to OpenAI-style model IDs.
 *
 *  v0-pro      → v0-1.5-md  Balanced speed & intelligence
 *  v0-max      → v0-1.5-lg  Maximum intelligence
 *  v0-max-fast → v0-1.5-lg  Maximum intelligence, 2.5x faster output
 *  v0-fast     → v0-1.5-sm  Lightning-fast, near-frontier
 */
const MODELS = [
  { id: "v0-pro",      desc: "v0-1.5-md · 均衡速度与智能（默认）" },
  { id: "v0-max",      desc: "v0-1.5-lg · 最高智能，适合复杂任务" },
  { id: "v0-max-fast", desc: "v0-1.5-lg · 最高智能 + 2.5x 输出加速" },
  { id: "v0-fast",     desc: "v0-1.5-sm · 极速，接近前沿能力" },
]

export async function GET() {
  return Response.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: 1748736000,
      owned_by: "vercel",
      description: m.desc,
      permission: [],
      root: m.id,
      parent: null,
    })),
  })
}
