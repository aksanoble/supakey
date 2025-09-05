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

function json(body: any, status = 200, headers: Record<string, string> = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  const { headers, allowed } = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (!allowed) return json({ error: 'origin_not_allowed' }, 403, headers)

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false }, db: { schema: 'supakey' } }
    )

    // Require Authorization header with Supakey JWT and verify it
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'unauthorized' }, 401, headers)

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userRes?.user) return json({ error: 'unauthorized' }, 401, headers)
    const supakeyUser = userRes.user

    const contentType = req.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await req.json() : Object.fromEntries(new URLSearchParams(await req.text()))
    const applicationId: string | null = body.applicationId ?? null
    const appIdentifier: string | null = body.appIdentifier ?? null

    if (!applicationId && !appIdentifier) {
      return json({ error: 'invalid_request', message: 'applicationId or appIdentifier is required' }, 400, headers)
    }

    // Use a user-aware client with RLS when possible
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false },
        db: { schema: 'supakey' },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    )

    // Resolve application and user connection with access control
    let application: any = null
    if (applicationId) {
      const { data, error } = await userClient
        .from('applications')
        .select(`
          id,
          app_identifier,
          user_connection_id,
          application_account_id
        `)
        .eq('id', applicationId)
        .single()
      if (error || !data) return json({ error: 'not_found', message: 'application not found' }, 404, headers)
      application = data
    } else {
      const { data, error } = await userClient
        .from('applications')
        .select(`
          id,
          app_identifier,
          user_connection_id,
          application_account_id
        `)
        .eq('app_identifier', appIdentifier)
        .single()
      if (error || !data) return json({ error: 'not_found', message: 'application not found' }, 404, headers)
      application = data
    }

    // Verify ownership: ensure the application belongs to the authenticated user via its user_connection
    {
      const { data: uc, error: ucErr } = await supabaseAdmin
        .from('user_connections')
        .select('user_id')
        .eq('id', application.user_connection_id)
        .single()
      if (ucErr || !uc || uc.user_id !== supakeyUser.id) {
        return json({ error: 'forbidden', message: 'not your application' }, 403)
      }
    }

    // Get connection and app account using service role (RLS-independent lookups)
    const { data: conn, error: connErr } = await supabaseAdmin
      .from('user_connections')
      .select('id, supabase_url, supabase_anon_key')
      .eq('id', application.user_connection_id)
      .single()
    if (connErr || !conn) return json({ error: 'server_error', message: 'connection not found' }, 500, headers)

    const { data: acct, error: acctErr } = await supabaseAdmin
      .from('application_accounts')
      .select('application_username, application_password')
      .eq('id', application.application_account_id)
      .single()
    if (acctErr || !acct) return json({ error: 'server_error', message: 'application account not found' }, 500, headers)

    // Ensure proper email format for sign-in
    let email = (acct.application_username || '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) email = `${email}@supakey.com`
    if (!emailRegex.test(email)) return json({ error: 'invalid_request', message: 'Invalid email format in application account' }, 400, headers)

    // Sign in to target project to mint tokens for Hasu app
    // Use anon key (client sign-in) instead of service role to avoid exposing server credentials
    const target = createClient(conn.supabase_url, conn.supabase_anon_key)
    const { data: signInData, error: signInError } = await target.auth.signInWithPassword({
      email,
      password: acct.application_password
    })
    if (signInError || !signInData?.session) return json({ error: 'server_error', message: 'failed to mint tokens' }, 500, headers)

    return json({
      jwt: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      username: acct.application_username,
      userId: signInData.session.user.id,
      applicationId: application.id,
      databaseUrl: conn.supabase_url,
      anonKey: conn.supabase_anon_key
    }, 200, headers)
  } catch (e) {
    const { headers } = getCorsHeaders(req)
    return json({ error: 'server_error' }, 500, headers)
  }
})
