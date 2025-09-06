import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin)
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
  if (allowed) base['Access-Control-Allow-Origin'] = origin
  return { headers: base, allowed }
}

// Simple HTML responder that applies per-request CORS headers
function html(req: Request, body: string, status = 200) {
  const { headers } = getCorsHeaders(req)
  return new Response(body, {
    status,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const { headers } = getCorsHeaders(req)
    return new Response('ok', { headers })
  }

  try {
    const url = new URL(req.url)
    const client_id = url.searchParams.get('client_id') || ''
    const redirect_uri = url.searchParams.get('redirect_uri') || ''
    const response_type = url.searchParams.get('response_type') || 'code'
    const state = url.searchParams.get('state') || ''
    const scope = url.searchParams.get('scope') || 'default'
    const code_challenge = url.searchParams.get('code_challenge') || ''
    const code_challenge_method = url.searchParams.get('code_challenge_method') || ''
    const app_identifier = url.searchParams.get('app_identifier') || ''

    if (response_type !== 'code') {
      const { headers } = getCorsHeaders(req)
      return new Response('unsupported_response_type', { status: 400, headers })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false }, db: { schema: 'supakey' } }
    )

    // With verify_jwt = true, Supabase will validate Authorization and forward the request.
    // Double-check for safety; if missing or invalid, redirect to /login with params.
    const authHeader = req.headers.get('authorization')
    const { data: { user } } = authHeader
      ? await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      : { data: { user: null } as any }

    if (!user) {
      const params = new URLSearchParams({
        client_id,
        redirect_uri,
        response_type,
        state,
        scope,
        code_challenge,
        code_challenge_method,
        app_identifier
      })
      const { headers } = getCorsHeaders(req)
      return new Response(null, { status: 302, headers: { ...headers, Location: `/login?${params.toString()}` } })
    }

    // Validate client
    const { data: client } = await supabase
      .from('oauth_clients')
      .select('client_id, client_name, redirect_uri, app_identifier')
      .eq('client_id', client_id)
      .single()

    if (!client) {
      const { headers } = getCorsHeaders(req)
      return new Response('invalid_client', { status: 400, headers })
    }

    if (client.redirect_uri !== redirect_uri) {
      const { headers } = getCorsHeaders(req)
      return new Response('invalid_redirect_uri', { status: 400, headers })
    }

    // Check consent
    const { data: consent } = await supabase
      .from('oauth_consents')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', client_id)
      .single()

    if (!consent) {
      // Render consent page
      const consentHtml = `
      <html><body style="font-family: Inter, system-ui, sans-serif; padding: 24px;">
        <h2>Authorize ${client.client_name}</h2>
        <p>${client.client_name} wants to access your Hasu data.</p>
        <form method="POST">
          <input type="hidden" name="client_id" value="${client_id}" />
          <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
          <input type="hidden" name="state" value="${state}" />
          <input type="hidden" name="scope" value="${scope}" />
          <input type="hidden" name="code_challenge" value="${code_challenge}" />
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method}" />
          <input type="hidden" name="app_identifier" value="${app_identifier}" />
          <button type="submit" style="padding: 10px 16px; background:#2d3748; color:#fff; border:none; border-radius:8px;">Allow</button>
        </form>
      </body></html>`
      const { headers } = getCorsHeaders(req)
      return new Response(consentHtml, { status: 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // If already consented, convert to POST handling to issue code
    if (req.method === 'GET') {
      // Fallthrough to code issuance without consent screen
    }

    // Handle POST (consent submission) or immediate code issuance
    if (req.method === 'POST' || req.method === 'GET') {
      let body: URLSearchParams | null = null
      if (req.method === 'POST') {
        const form = await req.formData()
        body = new URLSearchParams()
        for (const [k, v] of form.entries()) body.set(k, String(v))
      } else {
        body = url.searchParams
      }

      const cid = body.get('client_id') || client_id
      const ru = body.get('redirect_uri') || redirect_uri
      const st = body.get('state') || state
      const sc = body.get('scope') || scope
      const cc = body.get('code_challenge') || code_challenge
      const ccm = body.get('code_challenge_method') || code_challenge_method
      const ai = body.get('app_identifier') || app_identifier

      // Save consent if via POST
      if (req.method === 'POST' && !consent) {
        await supabase.from('oauth_consents').insert({ user_id: user.id, client_id: cid, scope: sc })
      }

      // Create authorization code short-lived
      const code = crypto.randomUUID().replace(/-/g, '')
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      await supabase.from('oauth_authorization_codes').insert({
        code,
        user_id: user.id,
        client_id: cid,
        redirect_uri: ru,
        code_challenge: cc || null,
        code_challenge_method: ccm || null,
        scope: sc,
        app_identifier: ai || null,
        expires_at: expiresAt
      })

      const redirect = new URL(ru)
      redirect.searchParams.set('code', code)
      if (st) redirect.searchParams.set('state', st)

      const { headers } = getCorsHeaders(req)
      return new Response(null, { status: 302, headers: { ...headers, Location: redirect.toString() } })
    }

    const { headers } = getCorsHeaders(req)
    return new Response('method_not_allowed', { status: 405, headers })
  } catch (e) {
    const { headers } = getCorsHeaders(req)
    return new Response('server_error', { status: 500, headers })
  }
})
