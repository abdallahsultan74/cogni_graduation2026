import "@supabase/functions-js/edge-runtime.d.ts"

const UPSTREAM_API_BASE =
  Deno.env.get("UPSTREAM_API_BASE") ?? "https://cogni-advisor-backend.vercel.app"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS"
}

function buildUpstreamUrl(req: Request) {
  const incomingUrl = new URL(req.url)
  const pathname = incomingUrl.pathname.replace(/^\/functions\/v1\/api/, "")
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  const upstreamPath = normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api${normalizedPath}`
  const upstreamUrl = new URL(normalizedPath, UPSTREAM_API_BASE)
  upstreamUrl.pathname = upstreamPath
  upstreamUrl.search = incomingUrl.search
  return upstreamUrl.toString()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders })

  const upstreamUrl = buildUpstreamUrl(req)
  const headers = new Headers(req.headers)
  headers.delete("host")
  headers.delete("content-length")

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer()

  const response = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body
  })

  const responseHeaders = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  })
})
