import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getCorsHeaders(_req: Request) {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supakey-internal',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': '*'
  }
  return { headers: base }
}

serve(async (req) => {
  const { headers } = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405, headers })

    // Require internal secret header for all calls (exposed publicly but protected by shared secret)
    const secret = Deno.env.get('INTERNAL_WEBHOOK_SECRET') || ''
    const provided = req.headers.get('x-supakey-internal') || ''
    if (!secret || provided !== secret) {
      return new Response('unauthorized', { status: 401, headers })
    }

    const url = new URL(req.url)
    const body = await req.json().catch(() => ({} as any))

    // Resolve user email/provider from body or current JWT
    let email = String(body?.email || url.searchParams.get('email') || '').trim()
    let provider = String(body?.provider || url.searchParams.get('provider') || '').trim()
    const event = String(body?.event || url.searchParams.get('event') || 'SIGNED_IN').trim()

    let isNew = false
    if (!email) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      if (token) {
        const { data: userRes } = await supabase.auth.getUser(token)
        const u = userRes?.user
        email = u?.email || email
        provider = (u?.app_metadata as any)?.provider || provider
        if (u?.created_at && (u as any)?.last_sign_in_at) {
          try {
            const created = new Date(u.created_at).getTime()
            const lastSignIn = new Date((u as any).last_sign_in_at).getTime()
            isNew = Math.abs(lastSignIn - created) < 5 * 60 * 1000
          } catch { /* noop */ }
        }
      }
    }

    if (!email) return new Response('bad_request - no email found', { status: 400, headers })

    const bot = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
    const chat = Deno.env.get('TELEGRAM_CHAT_ID') || ''
    if (!bot || !chat) return new Response('ok', { status: 200, headers })

    const when = new Date().toISOString()
    const verb = isNew ? 'signed up' : (/sign/i.test(event) ? event.replace(/_/g, ' ').toLowerCase() : 'signed in')
    const prov = provider ? ` via ${provider}` : ''
    const text = `Supakey auth: ${verb}${prov}\n• email: ${email}\n• at: ${when}`

    const telegramUrl = `https://api.telegram.org/bot${bot}/sendMessage`
    const payload = { chat_id: chat, text }
    const resp = await fetch(telegramUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const ok = resp.ok
    return new Response(JSON.stringify({ ok, status: resp.status }), { status: ok ? 200 : 502, headers: { ...headers, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: (e as Error)?.message || 'unexpected' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } })
  }
})
