import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getCorsHeaders(_req: Request) {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': '*'
  }
  return { headers: base, allowed: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const { headers } = getCorsHeaders(req)
    return new Response('ok', { headers })
  }

  try {
  const { headers } = getCorsHeaders(req)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false },
        db: { schema: 'supakey' }
      }
    )

    // Require Authorization and verify user
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } })
    }
    const user = userRes.user

    // Query user connection with RLS enforced via user-aware client
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false },
        db: { schema: 'supakey' },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    )

    const { data: conn, error: connErr } = await userClient
      .from('user_connections')
      .select('postgres_url, supabase_url, supabase_anon_key, supabase_secret_key, personal_access_token')
      .eq('user_id', user.id)
      .single()

    if (connErr || !conn) {
      return new Response(JSON.stringify({
        complete: false,
        missing: ['supabase_url', 'supabase_anon_key', 'supabase_secret_key', 'personal_access_token', 'postgres_url']
      }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } })
    }

    const has = {
      supabase_url: !!(conn.supabase_url && String(conn.supabase_url).trim()),
      supabase_anon_key: !!(conn.supabase_anon_key && String(conn.supabase_anon_key).trim()),
      supabase_secret_key: !!(conn.supabase_secret_key && String(conn.supabase_secret_key).trim()),
      personal_access_token: !!(conn.personal_access_token && String(conn.personal_access_token).trim()),
      postgres_url: !!(conn.postgres_url && String(conn.postgres_url).trim())
    }
    const missing = Object.entries(has).filter(([, v]) => !v).map(([k]) => k)
    const complete = Object.values(has).every(Boolean)

    return new Response(JSON.stringify({ complete, missing, has }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    const { headers } = getCorsHeaders(req)
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } })
  }
})
